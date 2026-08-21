import { useEffect, useRef, useMemo } from "react";

// ---------- 1. Canvas particle field (with links) ----------
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
        r: Math.random() * 1 + 1,
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

// ---------- 2. CSS rising particles (logos + bubbles) ----------
const PARTICLE_CONFIG = {
  logos: { count: 10, minSize: 8, maxSize: 22 },
  bubbles: { count: 15, minSize: 3, maxSize: 9 },
};

const CSSParticles = () => {
  const particles = useMemo(() => {
    const logos = Array.from({ length: PARTICLE_CONFIG.logos.count }, (_, i) => ({
      id: `l${i}`,
      isLogo: true,
      size:
        PARTICLE_CONFIG.logos.minSize +
        Math.random() * (PARTICLE_CONFIG.logos.maxSize - PARTICLE_CONFIG.logos.minSize),
      left: `${Math.random() * 100}%`,
      duration: `${14 + Math.random() * 20}s`,
      delay: `-${Math.random() * 25}s`,
      driftX: `${(Math.random() - 0.5) * 80}px`,
      opacity: 0.06 + Math.random() * 0.18,
    }));
    const bubbles = Array.from({ length: PARTICLE_CONFIG.bubbles.count }, (_, i) => ({
      id: `b${i}`,
      isLogo: false,
      size:
        PARTICLE_CONFIG.bubbles.minSize +
        Math.random() * (PARTICLE_CONFIG.bubbles.maxSize - PARTICLE_CONFIG.bubbles.minSize),
      left: `${Math.random() * 100}%`,
      duration: `${14 + Math.random() * 20}s`,
      delay: `-${Math.random() * 25}s`,
      driftX: `${(Math.random() - 0.5) * 80}px`,
      opacity: 0.5 + Math.random() * 0.3,
    }));
    return [...logos, ...bubbles];
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <div
          key={p.id}
          className="particle-rise"
          style={{
            left: p.left,
            width: `${p.size}px`,
            height: `${p.size}px`,
            "--duration": p.duration,
            "--delay": p.delay,
            "--drift-x": p.driftX,
            opacity: p.opacity,
          } as React.CSSProperties}
        >
          {p.isLogo ? (
            <img
              src="/assets/justlogo.png"
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                borderRadius: "50%",
                background: "rgba(255, 91, 31, 0.35)",
                border: "1px solid rgba(255, 91, 31, 0.45)",
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
};

// ---------- Grid lines (same as auth page) ----------
const GridLines = () => (
  <div
    className="absolute inset-0 pointer-events-none"
    style={{
      opacity: 0.08,
      backgroundImage: `linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)`,
      backgroundSize: "48px 48px",
    }}
  />
);

// ---------- Combined component with grid lines ----------
const styleContent = `
  .particle-rise {
    position: absolute;
    bottom: -50px;
    will-change: transform, opacity;
    animation: rise var(--duration) linear infinite var(--delay);
  }

  @keyframes rise {
    0% {
      transform: translateY(0) translateX(0);
      opacity: 0;
    }
    10% {
      opacity: 1;
    }
    90% {
      opacity: 1;
    }
    100% {
      transform: translateY(-110vh) translateX(var(--drift-x));
      opacity: 0;
    }
  }
`;

export default function ParticleBackground() {
  return (
    <>
      <style>{styleContent}</style>
      <div className="absolute inset-0 overflow-hidden">
        <CanvasParticles />
        {/* <CSSParticles /> */}
        <GridLines />   
      </div>
    </>
  );
}