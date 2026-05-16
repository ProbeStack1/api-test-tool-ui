/**
 * LandingFooter — final footer aligned with LANDING_PAGE_SPEC.md §10:
 * Product · Solutions · Pricing · Docs · Changelog · Status · Security · Contact.
 * Pure markup, no new colours — uses existing `bg-surface` / `text-text-*`
 * tokens so it inherits the theme automatically.
 */
import { Link } from 'react-router-dom';
import { Logo } from '@/components/common/Logo';
import { useEffect, useRef } from 'react';

// ---------- Canvas particle field (dots + link lines) ----------
const CanvasParticles = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;
    let w = 0,
      h = 0,
      dpr = Math.min(window.devicePixelRatio || 1, 2);

    type P = { x: number; y: number; vx: number; vy: number; r: number; c: string };
    const colors = ["#ff4400", "#1e00ff", "#00ff33"];
    let particles: P[] = [];

    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.scale(dpr, dpr);
      const count = Math.min(70, Math.floor((w * h) / 22000));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        r: Math.random() * 2 + 1,
        c: colors[Math.floor(Math.random() * colors.length)],
      }));
    };

    const tick = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.c;
        ctx.globalAlpha = 0.65;
        ctx.fill();
      }
      // link lines
      ctx.globalAlpha = 1;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i],
            b = particles[j];
          const dx = a.x - b.x,
            dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 120 * 120) {
            ctx.strokeStyle = `rgba(255,255,255,${0.16 * (1 - d2 / (120 * 120))})`;
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };

    resize();
    tick();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full"
      style={{ pointerEvents: "none" }}
    />
  );
};

const COLS: { title: string; links: { label: string; href: string; external?: boolean }[] }[] = [
  {
    title: 'Product',
    links: [
      { label: 'Workspaces',       href: '/#pillars' },
      { label: 'Mock Server',      href: '/#pillars' },
      { label: 'Functional Tests', href: '/#pillars' },
      { label: 'Load Tests',       href: '/#pillars' },
      { label: 'Security Scan',    href: '/#pillars' },
      { label: 'Bug Tracker',      href: '/#pillars' },
      { label: 'Monitors',         href: '/#pillars' },
      { label: 'MCP Studio',       href: '/#pillars' },
    ],
  },
  {
    title: 'Solutions',
    links: [
      { label: 'QA Engineers',         href: '/solutions#qa' },
      { label: 'Backend Developers',   href: '/solutions#dev' },
      { label: 'DevOps / SRE',         href: '/solutions#devops' },
      { label: 'Security Teams',       href: '/solutions#sec' },
      { label: 'API Product Managers', href: '/solutions#pm' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Pricing',    href: '/pricing' },
      { label: 'Docs',       href: '/api-hub' },
      { label: 'API Hub',    href: '/api-hub' },
      { label: 'Changelog',  href: '/changelog' },
      { label: 'Status',     href: '/status/forgeq' },
      { label: 'Security',   href: '/#security' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About',      href: '/#about' },
      { label: 'Contact',    href: 'mailto:hello@probestack.io', external: true },
      { label: 'GitHub',     href: 'https://github.com/ForgeCrux', external: true },
      { label: 'Twitter',    href: 'https://twitter.com/probestack', external: true },
    ],
  },
];

export default function LandingFooter() {
  return (
    <footer
      data-testid="landing-footer"
      className="relative z-10 border-t border-border bg-surface/40 backdrop-blur-xs"
    >
      {/* Canvas particle field with dynamic connecting lines */}
      <CanvasParticles />

      <div className="w-full px-6 sm:px-10 lg:px-16 xl:px-24 py-14">
        <div className="grid gap-10 md:grid-cols-5">
          {/* Brand block */}
          <div className="md:col-span-1">
            <Link to="/" data-testid="auth-logo-link" className="inline-flex items-center gap-2">
            <Logo variant="mark" className="h-12 w-10" />
            <div>
              <div className="text-[0.75rem] uppercase tracking-[0.18em] text-white/60">
                probestack
              </div>
              <div className="bg-gradient-to-r from-[#ff5b1f] via-[#ffb400] to-[#1fbf9a] bg-clip-text text-2xl font-bold leading-tight text-transparent">
                ForgeFuzz
              </div>
            </div>
          </Link>
            <p className="text-xs text-text-secondary leading-relaxed">
              The API lifecycle platform that ships with its own QA team — spec to incident, one workspace.
            </p>
            <p className="mt-3 text-[10px] font-mono text-text-muted">
              SOC2-ready · GDPR · audit log retention
            </p>
          </div>

          {/* Link columns */}
          {COLS.map((col) => (
            <div key={col.title}>
              <h4 className="text-[11px] uppercase tracking-wider font-semibold text-text-primary mb-3">
                {col.title}
              </h4>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link.label}>
                    {link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-text-secondary hover:text-primary transition-colors"
                        data-testid={`footer-link-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        to={link.href}
                        className="text-xs text-text-secondary hover:text-primary transition-colors"
                        data-testid={`footer-link-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-[11px] text-text-muted">
            © {new Date().getFullYear()} ProbeStack · ForgeFuzz. All rights reserved.
          </p>
          <p className="text-[10px] font-mono text-text-muted">
            {/* 16 microservices · MongoDB Atlas · Gemini-powered AI */}
          </p>
        </div>
      </div>
    </footer>
  );
}
