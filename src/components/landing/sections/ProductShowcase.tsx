/**
 * ProductShowcase — autoplay carousel of 7 real ForgeQ screenshots.
 *
 *   • Center-stage hero image with two flanking peek thumbnails.
 *   • 6-second autoplay (pause on hover).
 *   • Click any thumbnail / pagination dot / arrow to seek.
 *   • Numeric (01-07) chip + descriptive caption per slide.
 *   • Keyboard: ← / → seek, Space pause.
 *   • Theme-faithful — only uses existing tokens.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';

import dashboardImg  from '@/assets/landingpage/dashboard.png';
import collectionImg from '@/assets/landingpage/collection.png';
import variableImg   from '@/assets/landingpage/variable.png';
import mcpImg        from '@/assets/landingpage/mcp.png';
import apihubImg     from '@/assets/landingpage/apihub.png';
import aiImg         from '@/assets/landingpage/ai.png';
import settingImg    from '@/assets/landingpage/setting.png';

type Slide = {
  src: string;
  title: string;
  caption: string;
  pillar: string;
};

const SLIDES: Slide[] = [
  {
    src: dashboardImg,
    title: 'Cross-workspace dashboard',
    caption: 'Live RPS, p95 latency, OWASP findings, open bugs — all 16 microservices on one pane.',
    pillar: 'Dashboard',
  },
  {
    src: collectionImg,
    title: 'Collections & request builder',
    caption: 'GitHub-grade tree, GraphQL + HTTP, 4 auth presets, drag-to-reorder.',
    pillar: 'Pillar 01',
  },
  {
    src: variableImg,
    title: '5-level variable resolution',
    caption: 'Global → Workspace → Collection → Env → Local — secrets masked, audit-logged.',
    pillar: 'Pillar 02',
  },
  {
    src: mcpImg,
    title: 'MCP Studio',
    caption: 'Generate MCP servers from an OpenAPI spec, push to GitHub, deploy to Cloud Run in one click.',
    pillar: 'MCP',
  },
  {
    src: apihubImg,
    title: 'API Hub',
    caption: 'Public docs site at /docs/{slug} — four themes, custom intro markdown, multi-language code samples.',
    pillar: 'API Hub',
  },
  {
    src: aiImg,
    title: 'AI Assistant',
    caption: 'Gemini-powered query builder — "write a load profile that ramps to 500 VUs for 30s".',
    pillar: 'AI',
  },
  {
    src: settingImg,
    title: 'Workspace settings',
    caption: 'SSO, audit log export, per-environment escalation rules, region preferences.',
    pillar: 'Admin',
  },
];

export default function ProductShowcase() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<number | null>(null);

  const next = useCallback(() => setActive((i) => (i + 1) % SLIDES.length), []);
  const prev = useCallback(() => setActive((i) => (i - 1 + SLIDES.length) % SLIDES.length), []);

  // Autoplay
  useEffect(() => {
    if (paused) return;
    timerRef.current = window.setTimeout(next, 6000);
    return () => { if (timerRef.current) window.clearTimeout(timerRef.current); };
  }, [active, paused, next]);

  // Keyboard
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
  const leftIdx  = (active - 1 + SLIDES.length) % SLIDES.length;
  const rightIdx = (active + 1) % SLIDES.length;

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
            Built on real ForgeQ
          </div>
          <h2 className="text-3xl md:text-5xl font-bold gradient-text font-display mb-4 leading-tight">
            What you actually click. Not a render.
          </h2>
          <p className="text-text-secondary text-base md:text-lg">
            Every screen below is live in your workspace after sign-up. Use ← / → to navigate, Space to pause.
          </p>
        </div>

        {/* Hero stage */}
        <div className="relative max-w-[1400px] mx-auto">
          {/* Glow behind */}
          <div className="absolute inset-x-12 -top-6 bottom-6 bg-gradient-to-tr from-primary/20 via-transparent to-[#1fbf9a]/20 blur-3xl rounded-[3rem] pointer-events-none" />

          {/* Frame */}
          <div className="relative rounded-2xl border border-border/80 bg-surface/40 backdrop-blur-sm p-3 md:p-4 shadow-2xl shadow-black/40 ring-1 ring-primary/10 hover:ring-primary/30 transition-all duration-500">
            {/* Browser dots */}
            <div className="flex items-center gap-2 px-3 pb-3 border-b border-border/60">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ff5b1f]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#f5cf52]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#1fbf9a]" />
              <span className="ml-4 inline-flex items-center gap-2 text-[11px] font-mono text-text-muted">
                <span className="px-2 py-0.5 rounded-md bg-elevated/80 border border-border">
                  forgeq.probestack.io/{slide.pillar.toLowerCase().replace(/\s/g, '-')}
                </span>
              </span>
              <span className="ml-auto inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-mono text-primary border border-primary/30 rounded-md">
                {slide.pillar} · {String(active + 1).padStart(2, '0')} / {String(SLIDES.length).padStart(2, '0')}
              </span>
            </div>

            {/* Image stage */}
            <div className="relative overflow-hidden rounded-lg mt-3 aspect-[16/9] bg-elevated/40">
              {SLIDES.map((s, i) => (
                <img
                  key={s.src}
                  src={s.src}
                  alt={s.title}
                  draggable={false}
                  className={`absolute inset-0 w-full h-full object-cover object-top transition-all duration-700 ease-out ${
                    i === active
                      ? 'opacity-100 scale-100'
                      : 'opacity-0 scale-[1.03] pointer-events-none'
                  }`}
                />
              ))}

              {/* Bottom caption gradient */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/95 via-background/70 to-transparent p-5 md:p-7">
                <h3 className="text-base md:text-lg font-semibold text-text-primary mb-1">
                  {slide.title}
                </h3>
                <p className="text-xs md:text-sm text-text-secondary max-w-2xl">
                  {slide.caption}
                </p>
              </div>

              {/* Side nav arrows */}
              <button
                type="button"
                aria-label="Previous slide"
                data-testid="showcase-prev"
                onClick={prev}
                className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-surface/80 backdrop-blur-md border border-border hover:border-primary/60 hover:text-primary text-text-secondary flex items-center justify-center transition-all hover:scale-105"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                aria-label="Next slide"
                data-testid="showcase-next"
                onClick={next}
                className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-surface/80 backdrop-blur-md border border-border hover:border-primary/60 hover:text-primary text-text-secondary flex items-center justify-center transition-all hover:scale-105"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Peek thumbnails (md+) */}
          <div className="hidden md:flex items-center justify-center gap-3 mt-6">
            <button
              type="button"
              onClick={prev}
              className="relative h-20 w-32 rounded-md overflow-hidden border border-border/60 opacity-50 hover:opacity-80 transition-all"
              aria-label="Show previous"
              data-testid="showcase-peek-prev"
            >
              <img src={SLIDES[leftIdx].src} alt="" className="w-full h-full object-cover object-top" />
            </button>

            {/* Dots */}
            <div className="flex items-center gap-1.5 px-3">
              {SLIDES.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Go to slide ${i + 1}`}
                  data-testid={`showcase-dot-${i}`}
                  onClick={() => setActive(i)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === active
                      ? 'w-8 bg-primary'
                      : 'w-1.5 bg-border hover:bg-text-secondary'
                  }`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={next}
              className="relative h-20 w-32 rounded-md overflow-hidden border border-border/60 opacity-50 hover:opacity-80 transition-all"
              aria-label="Show next"
              data-testid="showcase-peek-next"
            >
              <img src={SLIDES[rightIdx].src} alt="" className="w-full h-full object-cover object-top" />
            </button>

            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              data-testid="showcase-pause"
              className="ml-2 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border bg-surface/50 text-xs text-text-secondary hover:text-primary hover:border-primary/50 transition-colors"
            >
              {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
              {paused ? 'Play' : 'Pause'}
            </button>
          </div>

          {/* Compact dots for mobile */}
          <div className="flex md:hidden items-center justify-center gap-1.5 mt-5">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActive(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === active ? 'w-6 bg-primary' : 'w-1.5 bg-border'
                }`}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
