import { useEffect, useState, useRef, useCallback } from 'react';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { Image as ImageIcon, Maximize2, X, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import dashboard01 from "../../assets/landingPageGallary/Dashboard01.PNG";
import dashboard02 from "../../assets/landingPageGallary/Dashboard02.PNG";
import dashboard03 from "../../assets/landingPageGallary/dashboard03.PNG";
import dashboard04 from "../../assets/landingPageGallary/Dashboard04.PNG";

import chatbot01 from "../../assets/landingPageGallary/chatbot01.PNG";
import chatbot02 from "../../assets/landingPageGallary/chatbot02.PNG";
import chatbot03 from "../../assets/landingPageGallary/chatbot03.PNG";
import chatbot04 from "../../assets/landingPageGallary/chatbot04.PNG";
import chatbot05 from "../../assets/landingPageGallary/chatbot05.PNG";

import collection01 from "../../assets/landingPageGallary/Collection01.PNG";
import collection02 from "../../assets/landingPageGallary/collection02.PNG";

import history01 from "../../assets/landingPageGallary/history01.PNG";
import history02 from "../../assets/landingPageGallary/history02.PNG";

import mcp01 from "../../assets/landingPageGallary/mcp01.PNG";
import mcp02 from "../../assets/landingPageGallary/mcp02.PNG";
import mcp03 from "../../assets/landingPageGallary/mcp03.PNG";
import mcp04 from "../../assets/landingPageGallary/mcp04.PNG";
import mcp05 from "../../assets/landingPageGallary/mcp05.PNG";
import mcp06 from "../../assets/landingPageGallary/mcp06.PNG";

import mock01 from "../../assets/landingPageGallary/mock01.PNG";
import mock02 from "../../assets/landingPageGallary/mock02.PNG";

import spec01 from "../../assets/landingPageGallary/spec01.PNG";
import spec02 from "../../assets/landingPageGallary/spec02.PNG";
import spec03 from "../../assets/landingPageGallary/spec03.PNG";
import spec04 from "../../assets/landingPageGallary/spec04.PNG";

/**
 * Category data with multiple images each.
 * Swap `url` fields with your real asset URLs later.
 * Each tile cycles images at its own `interval` (ms) for a more organic feel.
 */
const categories = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    span: 'col-span-2 row-span-2',
    interval: 7200,
    images: [
      { url: dashboard01, title: 'Unified Dashboard', text: 'Monitor every API, test run & SLA in a single pane of glass.' },
      { url: dashboard02, title: 'Realtime KPIs', text: 'Live charts stream success rate, p95 latency and error budget.' },
      { url: dashboard03, title: 'Service Map', text: 'Visualize dependencies across microservices & third-party APIs.' },
      { url: dashboard04, title: 'Drill-down Analytics', text: 'Zoom from org → team → endpoint with one click.' },
      // { url: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=1200&q=80', title: 'Custom Widgets', text: 'Drag, drop & pin the metrics that matter to you.' },
    ],
  },
  {
    id: 'execution',
    title: 'Request Execution',
    span: 'col-span-1 row-span-1',
    interval: 6600,
    images: [
      { url: collection01, title: 'Request Builder', text: 'Craft complex REST/GraphQL calls with auth helpers.' },
      { url: collection02, title: 'Scripted Runs', text: 'Pre & post scripts for dynamic variables and chaining.' },
      // { url: 'https://images.unsplash.com/photo-1542831371-29b0f74f9713?w=1000&q=80', title: 'Response Inspector', text: 'Headers, body diff, timings — everything you need.' },
      // { url: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1000&q=80', title: 'Env Switcher', text: 'Dev, staging, prod — one click to change context.' },
    ],
  },
  {
    id: 'testing',
    title: 'Load & Performance Testing',
    span: 'col-span-1 row-span-1',
    interval: 5000,
    images: [
      { url: spec01, title: 'Load Test', text: 'Scale up to 100k virtual users from global regions.' },
      { url: spec02, title: 'Performance Test', text: 'Track p50/p95/p99 and catch regressions automatically.' },
      { url: spec03, title: 'Stress Scenarios', text: 'Spike, soak and ramp patterns built-in.' },
      { url: spec04, title: 'Threshold Gates', text: 'Fail builds when SLO budget is burned.' },
    ],
  },
  {
    id: 'history',
    title: 'History',
    span: 'col-span-1 row-span-1',
    interval: 6400,
    images: [
      { url: history01, title: 'Run Timeline', text: 'Every execution stored with full fidelity.' },
      { url: history02, title: 'Audit Trail', text: 'Who ran what, when, and from where.' },
      // { url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1000&q=80', title: 'Diff View', text: 'Compare two runs side-by-side to spot drift.' },
      // { url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1000&q=80', title: 'Replay', text: 'Re-run any historic request with one click.' },
    ],
  },
  {
    id: 'chatbot',
    title: 'AI Chatbot Help',
    span: 'col-span-1 row-span-1',
    interval: 4400,
    images: [
      { url: chatbot01, title: 'Ask in Plain English', text: 'Generate requests, tests & assertions by chatting.' },
      { url: chatbot02, title: 'Debug Assistant', text: 'Paste an error — get the fix instantly.' },
      { url: chatbot03, title: 'Doc Copilot', text: 'Auto-summarize any API schema or OpenAPI spec.' },
      { url: chatbot04, title: 'Workflow Suggestions', text: 'Smart next-step hints tuned to your project.' },
    ],
  },
  {
    id: 'mcp',
    title: 'MCP Integration',
    span: 'col-span-2 row-span-1',
    interval: 5800,
    images: [
      { url: mcp01, title: 'Model Context Protocol', text: 'Plug ProbeStack directly into Claude, GPT & Gemini.' },
      { url: mcp02, title: 'Tool Registry', text: 'Expose APIs as callable tools to your agents.' },
      { url: mcp03, title: 'Secure Bridging', text: 'Scoped tokens & audit-logged calls.' },
      { url: mcp04, title: 'Live MCP Console', text: 'Watch tool calls stream in real-time.' },
    ],
  },
  {
    id: 'mock',
    title: 'Mock Server',
    span: 'col-span-2 row-span-1',
    interval: 4800,
    images: [
      { url: mock01, title: 'Instant Mocks', text: 'Spin up contract-accurate mocks in seconds.' },
      { url: mock02, title: 'Smart Stubs', text: 'Dynamic, schema-aware response generation.' },
      // { url: 'https://images.unsplash.com/photo-1542831371-29b0f74f9713?w=1400&q=80', title: 'Latency Simulation', text: 'Test resilience against slow or flaky upstreams.' },
      // { url: 'https://images.unsplash.com/photo-1629904853893-c2c8981a1dc5?w=1400&q=80', title: 'Scenario Switching', text: 'Happy-path, error states & edge cases on demand.' },
    ],
  },
];

/** Image that renders a shimmer placeholder until loaded, and falls back on error. */
function SmartImage({ src, alt, className, onLoad }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  // Reset on src change so each cycle re-shows the shimmer briefly if needed
  useEffect(() => {
    setLoaded(false);
    setFailed(false);
  }, [src]);

  return (
    <div className="relative w-full h-full">
      {!loaded && !failed && <div className="absolute inset-0 img-placeholder-shimmer" />}
      {failed ? (
        <div className="absolute inset-0 img-placeholder-shimmer flex flex-col items-center justify-center gap-3">
          <ImageIcon className="w-10 h-10 text-[#ff5b1f]/30" />
          <span className="text-xs landing-text-secondary">{alt}</span>
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className={className}
          onLoad={() => {
            setLoaded(true);
            onLoad?.();
          }}
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}

/** A single bento tile that auto-cycles through a category's images. */
function GalleryItem({ category, isVisible, index, onExpand }) {
  const [current, setCurrent] = useState(0);
  const [fading, setFading] = useState(false);
  const [hovered, setHovered] = useState(false);
  const timerRef = useRef(null);

  const total = category.images.length;

  useEffect(() => {
    if (total <= 1 || hovered) return undefined;

    timerRef.current = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setCurrent((c) => (c + 1) % total);
        setFading(false);
      }, 600); // matches fade-out duration
    }, category.interval);

    return () => clearInterval(timerRef.current);
  }, [category.interval, total, hovered]);

  const active = category.images[current];

  return (
    <div
      data-testid={`gallery-item-${category.id}`}
      className={`${category.span} relative group rounded-2xl overflow-hidden landing-card-bg border landing-border hover:border-[#ff5b1f]/40 cursor-pointer transition-all duration-500 ${isVisible ? 'animate-slide-in-bottom' : 'opacity-0 translate-y-8'}`}
      style={{
        animationDelay: `${index * 0.1}s`,
        minHeight: category.span.includes('row-span-2') ? '320px' : '160px',
      }}
      onClick={() => onExpand(category)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Cycling image */}
      <div
        className={`absolute inset-0 transition-opacity duration-700 ${fading ? 'opacity-0' : 'opacity-100'}`}
        key={active.url}
      >
        <SmartImage
          src={active.url}
          alt={active.title}
          className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 px-2"
        />
      </div>

      {/* Gradient scrim for legibility */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0e1629]/95 via-[#0e1629]/30 to-transparent pointer-events-none" />

      {/* Always-visible title (fades with image) */}
      <div
        className={`absolute top-3 left-3 right-3 flex items-center gap-2 transition-opacity duration-700 ${fading ? 'opacity-0' : 'opacity-100'}`}
      >
        <span className="text-[10px] tracking-[0.18em] uppercase text-[#ff5b1f] font-semibold bg-[#ff5b1f]/10 border border-[#ff5b1f]/30 rounded-full px-2 py-0.5 backdrop-blur-sm">
          {category.title}
        </span>
      </div>

      {/* Bottom caption cycles with image */}
      <div
        className={`absolute bottom-0 left-0 right-0 p-4 transition-all duration-700 ${fading ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'}`}
      >
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-white truncate font-heading">{active.title}</div>
            <div className="text-[11px] text-white/60 line-clamp-1">{active.text}</div>
          </div>
          <Maximize2 className="w-4 h-4 text-white/60 shrink-0 group-hover:text-[#ff5b1f] group-hover:scale-110 transition-all" />
        </div>

        {/* Progress dots */}
        <div className="flex items-center gap-1 mt-2">
          {category.images.map((_, i) => (
            <span
              key={i}
              className={`h-[3px] rounded-full transition-all duration-500 ${i === current ? 'w-5 bg-[#ff5b1f]' : 'w-2 bg-white/30'}`}
            />
          ))}
        </div>
      </div>

      {/* Subtle hover glow */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none ring-1 ring-inset ring-[#ff5b1f]/20" />
    </div>
  );
}

/** Full-screen lightbox carousel for a single category. */
function LightboxCarousel({ category, onClose }) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [direction, setDirection] = useState(1);
  const timerRef = useRef(null);
  const total = category.images.length;

  const go = useCallback(
    (dir) => {
      setDirection(dir);
      setIndex((i) => (i + dir + total) % total);
    },
    [total]
  );

  // Autoplay
  useEffect(() => {
    if (!playing || total <= 1) return undefined;
    timerRef.current = setInterval(() => {
      setDirection(1);
      setIndex((i) => (i + 1) % total);
    }, 3000);
    return () => clearInterval(timerRef.current);
  }, [playing, total]);

  // Keyboard nav
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === ' ') {
        e.preventDefault();
        setPlaying((p) => !p);
      }
    };
    window.addEventListener('keydown', onKey);
    // Lock body scroll
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [go, onClose]);

  const active = category.images[index];

  return (
    <div
      data-testid="gallery-lightbox"
      className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-8 animate-fade-in"
      onClick={onClose}
    >
      {/* Close */}
      <button
        data-testid="lightbox-close"
        className="absolute top-5 right-5 text-white/70 hover:text-white transition-colors z-10 p-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Close"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Category chip */}
      <div className="absolute top-5 left-5 z-10 flex items-center gap-2">
        <span className="text-[10px] tracking-[0.18em] uppercase text-[#ff5b1f] font-semibold bg-[#ff5b1f]/10 border border-[#ff5b1f]/30 rounded-full px-3 py-1 backdrop-blur-sm">
          {category.title}
        </span>
        <span className="text-xs text-white/50">
          {index + 1} / {total}
        </span>
      </div>

      {/* Content */}
      <div
        className="relative w-full max-w-5xl h-full max-h-[72vh] flex flex-col items-stretch gap-4 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Image frame */}
        <div className="relative flex-1 rounded-3xl overflow-hidden border landing-border landing-card-bg shadow-[0_30px_80px_-20px_rgba(255,91,31,0.25)]">
          {/* Slide transition */}
          <div
            key={active.url}
            className={`absolute inset-0 ${direction > 0 ? 'animate-slide-in-right' : 'animate-slide-in-left'}`}
          >
            <SmartImage
              src={active.url}
              alt={active.title}
              className="w-full h-full object-cover"
            />
            {/* Caption scrim */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0e1629]/95 via-[#0e1629]/60 to-transparent p-6 sm:p-8">
              <h3 className="text-xl sm:text-2xl font-bold text-white font-heading">{active.title}</h3>
              <p className="text-sm sm:text-base text-white/70 mt-1 max-w-2xl">{active.text}</p>
            </div>
          </div>

          {/* Arrows */}
          {total > 1 && (
            <>
              <button
                data-testid="lightbox-prev"
                onClick={(e) => {
                  e.stopPropagation();
                  go(-1);
                }}
                className="absolute left-3 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/40 hover:bg-[#ff5b1f] text-white border border-white/10 backdrop-blur-sm transition-all hover:scale-110"
                aria-label="Previous"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                data-testid="lightbox-next"
                onClick={(e) => {
                  e.stopPropagation();
                  go(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/40 hover:bg-[#ff5b1f] text-white border border-white/10 backdrop-blur-sm transition-all hover:scale-110"
                aria-label="Next"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}
        </div>

        {/* Controls: dots + play/pause + thumbnails */}
        <div className="flex items-center justify-between gap-4 px-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setPlaying((p) => !p);
            }}
            className="flex items-center gap-2 text-xs text-white/70 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-full px-3 py-1.5 transition-colors"
            data-testid="lightbox-playpause"
          >
            {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {playing ? 'Pause' : 'Play'}
          </button>

          <div className="flex items-center gap-2">
            {category.images.map((_, i) => (
              <button
                key={i}
                onClick={(e) => {
                  e.stopPropagation();
                  setDirection(i > index ? 1 : -1);
                  setIndex(i);
                }}
                className={`h-2 rounded-full transition-all duration-500 ${i === index ? 'w-8 bg-[#ff5b1f]' : 'w-2 bg-white/25 hover:bg-white/50'}`}
                aria-label={`Go to slide ${i + 1}`}
                data-testid={`lightbox-dot-${i}`}
              />
            ))}
          </div>

          <div className="text-xs text-white/40 hidden sm:block">← → to navigate · ESC to close</div>
        </div>
      </div>
    </div>
  );
}

export default function ShowcaseGallery() {
  const [ref, isVisible] = useScrollReveal();
  const [expanded, setExpanded] = useState(null);

  return (
    <section
      data-testid="showcase-section"
      ref={ref}
      className="relative z-10 py-20 border-b landing-border"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`text-center mb-12 ${isVisible ? 'animate-fade-in-up' : 'opacity-0'}`}>
          <h2
            data-testid="showcase-title"
            className="text-3xl sm:text-4xl font-bold landing-text-primary font-heading"
          >
            See It In Action
          </h2>
          <p className="text-sm landing-text-secondary mt-2 max-w-lg mx-auto">
            Screenshots from the ProbeStack platform — click any tile to explore the full story
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 auto-rows-[160px]">
          {categories.map((cat, i) => (
            <GalleryItem
              key={cat.id}
              category={cat}
              isVisible={isVisible}
              index={i}
              onExpand={setExpanded}
            />
          ))}
        </div>
      </div>

      {expanded && <LightboxCarousel category={expanded} onClose={() => setExpanded(null)} />}
    </section>
  );
}
