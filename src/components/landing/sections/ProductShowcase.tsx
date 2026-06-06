import { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Boxes,
  Workflow,
  Server,
  Sparkles,
  KeyRound,
  Pause,
  Play,
  type LucideIcon,
} from "lucide-react";

type Slide = {
  id: string;
  num: string;
  title: string;
  desc: string;
  url: string;
  icon: LucideIcon;
  img: string;
};

const SLIDES: Slide[] = [
  {
    id: "dashboard",
    num: "01",
    title: "API Dashboard",
    desc: "Cross-project observability — live RPS, p95 latency, OWASP findings, open bugs. Every microservice on one pane.",
    url: "forgeq.probestack.io/dashboard",
    icon: LayoutDashboard,
    img: "https://forgeq.probestack.io/assets/dashboard-B5LTIuMv.png",
  },
  {
    id: "collection",
    num: "02",
    title: "Request Runner",
    desc: "Postman-grade 3-pane builder. Collections tree, request builder, live response — real send → 200 OK in ~47 ms.",
    url: "forgeq.probestack.io/collections",
    icon: Boxes,
    img: "https://forgeq.probestack.io/assets/collection-DJcYl2Ym.png",
  },
  {
    id: "mcp",
    num: "03",
    title: "MCP Stdio Console",
    desc: "Inspect MCP tools, replay calls, JSON-Diff between two responses. Catalog of 32+ servers with live health.",
    url: "forgeq.probestack.io/mcp",
    icon: Workflow,
    img: "https://forgeq.probestack.io/assets/mcp-DMkkZpDR.png",
  },
  {
    id: "apihub",
    num: "04",
    title: "API Hub",
    desc: "Central catalog for every spec, mock and service. Tag, version, share — your team's source of truth.",
    url: "forgeq.probestack.io/hub",
    icon: Server,
    img: "https://forgeq.probestack.io/assets/apihub-DVco31W7.png",
  },
  {
    id: "ai",
    num: "05",
    title: "AI Assistant",
    desc: "Gemini-powered: write load profiles, generate assertions, explain OWASP findings, summarise incidents.",
    url: "forgeq.probestack.io/ai",
    icon: Sparkles,
    img: "https://forgeq.probestack.io/assets/ai-NMBiHR0c.png",
  },
  {
    id: "variable",
    num: "06",
    title: "Variable Manager",
    desc: "5-level resolution: Global → Project → Collection → Env → Local. Secrets masked. Audit-logged.",
    url: "forgeq.probestack.io/variables",
    icon: KeyRound,
    img: "https://forgeq.probestack.io/assets/variable-DOICgIwJ.png",
  },
];

// Derive the light-theme variant from the dark URL by inserting `-light` before the extension.
// e.g. ".../ai-NMBiHR0c.png" → ".../ai-NMBiHR0c-light.png"
function toLightSrc(src: string): string {
  return src.replace(/(\.[a-z0-9]+)(\?.*)?$/i, "-light$1$2");
}

function useIsLightTheme(): boolean {
  const [light, setLight] = useState(false);
  useEffect(() => {
    const root = document.documentElement;
    const update = () => setLight(root.classList.contains("light"));
    update();
    const mo = new MutationObserver(update);
    mo.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => mo.disconnect();
  }, []);
  return light;
}

function LocalHeader({
  eyebrow,
  title,
  sub,
}: {
  eyebrow: string;
  title: React.ReactNode;
  sub?: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
        <span className="h-1.5 w-1.5 rounded-full bg-brand-orange animate-pulse" />
        {eyebrow}
      </div>
      <h2 className="mt-4 font-display text-3xl font-bold leading-tight text-text-primary sm:text-4xl lg:text-[44px]">
        {title}
      </h2>
      {sub && <p className="mt-4 text-[15px] leading-relaxed text-text-secondary">{sub}</p>}
    </div>
  );
}

export default function ProductShowcase() {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [loaded, setLoaded] = useState<Record<string, boolean>>({});
  const isLight = useIsLightTheme();

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setI((p) => (p + 1) % SLIDES.length), 5500);
    return () => clearInterval(t);
  }, [paused]);

  // Preload both theme variants so switching/tabbing doesn't trigger layout shifts
  useEffect(() => {
    SLIDES.forEach((sl) => {
      [sl.img, toLightSrc(sl.img)].forEach((url) => {
        const im = new Image();
        im.onload = () => setLoaded((m) => ({ ...m, [url]: true }));
        im.src = url;
      });
    });
  }, []);

  // Keyboard nav
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setI((p) => (p + 1) % SLIDES.length);
      if (e.key === "ArrowLeft") setI((p) => (p - 1 + SLIDES.length) % SLIDES.length);
      if (e.key === " ") {
        e.preventDefault();
        setPaused((x) => !x);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const s = SLIDES[i];
  const Icon = s.icon;
  const activeSrc = isLight ? toLightSrc(s.img) : s.img;
  const isLoaded = !!loaded[activeSrc];

  return (
    <section id="showcase" className="relative py-24 border-t border-border">
      <div className="mx-auto w-full max-w-screen-2xl px-4 sm:px-6">
        <LocalHeader
          eyebrow="Designed in code · always crisp"
          title={
            <>
              What you actually click. <span className="gradient-text">Not a render.</span>
            </>
          }
          sub="Six surfaces from the live product. Use ← / → to navigate, Space to pause."
        />

        <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-surface/80 backdrop-blur">
          {/* Browser chrome */}
          <div className="flex items-center justify-between border-b border-border bg-surface-elevated/70 px-4 py-2.5">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
            </div>
            <div className="flex items-center gap-2 rounded-md border border-border bg-surface-elevated px-3 py-1 font-mono text-[11px] text-text-secondary">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-teal animate-pulse" />
              {s.url}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[10.5px] text-text-muted">
                {s.num} / 0{SLIDES.length}
              </span>
              <button
                onClick={() => setPaused((x) => !x)}
                className="grid h-6 w-6 place-items-center rounded border border-border text-text-secondary hover:text-text-primary"
                aria-label={paused ? "Play" : "Pause"}
              >
                {paused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
              </button>
            </div>
          </div>

          <div className="grid lg:grid-cols-[260px_1fr]">
            {/* Tabs */}
            <div className="border-b border-border lg:border-b-0 lg:border-r">
              <div className="flex overflow-x-auto p-2 lg:flex-col">
                {SLIDES.map((sl, idx) => {
                  const SI = sl.icon;
                  const active = idx === i;
                  return (
                    <button
  key={sl.id}
  onClick={() => setI(idx)}
  className={`flex items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2.5 text-left text-[13px] transition lg:whitespace-normal ${
    active
      ? "bg-gradient-to-r from-primary/10 to-transparent text-text-primary border-l-2 border-primary rounded-r-lg pl-3 pr-3"
      : "text-text-secondary hover:bg-surface-elevated/60"
  }`}
>
                      <span
                        className={`grid h-7 w-7 shrink-0 place-items-center rounded-md ${
                          active ? " text-primary scale-150" : "bg-surface-elevated"
                        }`}
                      >
                        <SI className="h-3.5 w-3.5" />
                      </span>
                      <div className="hidden lg:block">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                          Surface {sl.num}
                        </div>
                        <div className="font-medium">{sl.title}</div>
                      </div>
                      <span className="lg:hidden">{sl.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Stage */}
            <div className="relative p-5 sm:p-7">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                    <Icon className="h-3.5 w-3.5 text-brand-amber" />
                    Surface {s.num} · Live product
                  </div>
                  <h3 className="mt-1.5 font-display text-2xl font-bold text-text-primary">{s.title}</h3>
                  <p className="mt-1.5 max-w-xl text-[13.5px] text-text-secondary">{s.desc}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => setI((p) => (p - 1 + SLIDES.length) % SLIDES.length)}
                    className="grid h-8 w-8 place-items-center rounded-md border border-border text-text-secondary hover:text-text-primary"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setI((p) => (p + 1) % SLIDES.length)}
                    className="grid h-8 w-8 place-items-center rounded-md border border-border text-text-secondary hover:text-text-primary"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Screenshot — fixed aspect ratio prevents height jumps while loading */}
              <div className="group relative overflow-hidden rounded-xl border border-border bg-surface-elevated shadow-[0_30px_80px_-30px_rgba(255,91,31,0.35)]">
                <div
                  className="pointer-events-none absolute -inset-px rounded-xl opacity-50 blur-2xl"
                  style={{
                    background:
                      "radial-gradient(60% 80% at 50% 0%, rgba(255,91,31,.25), transparent 70%)",
                  }}
                />
                {/* Reserve space using aspect ratio so the layout never jumps */}
                <div className="relative w-full" style={{ aspectRatio: "20 / 10" }}>
                  {/* Skeleton shimmer while the active image is loading */}
                  {!isLoaded && (
                    <div className="absolute inset-0 shimmer-bg bg-surface-elevated" />
                  )}
                  <img
                    key={activeSrc}
                    src={activeSrc}
                    alt={s.title}
                    loading="lazy"
                    onError={(e) => {
                      // Fall back to the dark variant if the -light file isn't uploaded yet
                      const el = e.currentTarget;
                      if (el.src !== s.img) el.src = s.img;
                    }}
                    decoding="async"
                    onLoad={() => setLoaded((m) => ({ ...m, [s.id]: true }))}
                    className={`absolute inset-0 h-full w-full object-contain transition-all duration-700 group-hover:scale-[1.015] ${
                      isLoaded ? "opacity-100" : "opacity-0"
                    }`}
                  />
                </div>
                <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] animate-scan bg-gradient-to-r from-transparent via-brand-orange/70 to-transparent" />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-3">
                  <span className="font-mono text-[10.5px] text-white/80">{s.url}</span>
                  <span className="rounded-md bg-brand-teal/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-brand-teal">
                    LIVE
                  </span>
                </div>
              </div>

              {/* progress dots */}
              <div className="mt-5 flex gap-1.5">
                {SLIDES.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setI(idx)}
                    className={`h-1 rounded-full transition-all ${
                      idx === i ? "w-10 bg-primary" : "w-4 bg-border hover:bg-text-muted/40"
                    }`}
                    aria-label={`Go to surface ${idx + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}