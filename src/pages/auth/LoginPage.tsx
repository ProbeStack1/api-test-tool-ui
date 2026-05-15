/**
 * Auth Page — Sign In / Sign Up.
 *
 * Two-pane experience tuned to ForgeQ's existing dark theme:
 *   • Left: animated branding panel (gradient orbs + feature highlights),
 *     uses landing-page CSS tokens (#ff5b1f orange · #1fbf9a teal · #ffb400 amber).
 *   • Right: glass-morphism card holding the live form. Mode toggles between
 *     Sign In and Create Account without a route change.
 *
 * Behaviour:
 *   • The query string `?mode=signup` deep-links to register form.
 *   • Submit is wired to the dev-bypass identity for now (no real auth yet)
 *     and routes to `/projects/collections`.
 *   • Pressing "Continue without account" (skip) preserves the existing
 *     unauthenticated demo flow.
 *
 * Theme: dark by default, light theme inherited via the global theme toggle.
 */
import { useEffect, useMemo, useState, type FormEvent, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  Eye,
  EyeOff,
  Github,
  Mail,
  Lock,
  User as UserIcon,
  Sparkles,
  ShieldCheck,
  Activity,
  Boxes,
  TestTube2,
  Rocket,
} from 'lucide-react';
import { Logo } from '@/components/common/Logo';
import { cn } from '@/utils/cn';

type Mode = 'signin' | 'signup';

const HIGHLIGHTS = [
  { icon: Boxes,       title: '32 + MCP servers',   desc: 'Catalog · health · audit trail' },
  { icon: TestTube2,   title: 'Functional + Load',  desc: 'p50/p95 charts · live SSE runs'  },
  { icon: ShieldCheck, title: 'API Governance',     desc: 'Spec drift · security gates'     },
  { icon: Activity,    title: 'Real-time Monitors', desc: '99.94 % observed uptime'         },
];

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

// ---------- CSS rising particles (logos + bubbles) ----------
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

// Animation keyframes for rising particles
const particleRiseStyles = `
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

export const LoginPage = () => {
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const initialMode: Mode = params.get('mode') === 'signup' ? 'signup' : 'signin';

  const [mode, setMode] = useState<Mode>(initialMode);
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    company: '',
    remember: true,
  });

  // Keep URL state in sync so deep-links bookmark correctly.
  useEffect(() => {
    const next = new URLSearchParams(params);
    if (mode === 'signup') next.set('mode', 'signup');
    else next.delete('mode');
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const title = mode === 'signin' ? 'Welcome back' : 'Create your account';
  const subtitle =
    mode === 'signin'
      ? 'Sign in to your ForgeFuzz workspace.'
      : 'Start shipping reliable APIs in minutes.';

  const onChange = (k: keyof typeof form) => (e: any) =>
    setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    // Demo / dev-bypass path — backend wiring happens in Phase 1.
    await new Promise((r) => setTimeout(r, 450));
    setSubmitting(false);
    nav('/projects/collections');
  };

  const onSkip = () => nav('/projects/collections');

  return (
    <div
      data-testid="auth-page"
      className="relative min-h-screen w-full overflow-hidden bg-[#0b0d12] text-white"
    >
      {/* Inject keyframes for rising particles */}
      <style>{particleRiseStyles}</style>

      {/* Ambient gradient orbs — reuse landing palette so brand stays consistent */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute -left-1/4 -top-1/4 h-[60%] w-[60%] animate-pulse rounded-full bg-[#ff5b1f]/25 blur-[140px]" />
        <div
          className="absolute -bottom-1/4 -right-1/4 h-[55%] w-[55%] animate-pulse rounded-full bg-[#1fbf9a]/20 blur-[140px]"
          style={{ animationDelay: '1.5s' }}
        />
        <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.6)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.6)_1px,transparent_1px)] [background-size:48px_48px]" />
      </div>

      {/* Canvas particle field with dynamic connecting lines */}
      <CanvasParticles />

      {/* CSS rising particles (logos + bubbles) */}
      {/* <CSSParticles /> */}

      <div className="relative z-10 mx-auto grid min-h-screen w-full max-w-[1400px] grid-cols-1 lg:grid-cols-[1.05fr_1fr]">
        {/* === LEFT: brand / value panel ============================ */}
        <aside
          data-testid="auth-brand-panel"
          className="hidden flex-col justify-between p-10 lg:flex lg:p-14"
        >
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

          <div className="space-y-8">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/70">
                <Sparkles className="h-3.5 w-3.5 text-[#ffb400]" />
                The API workbench engineers actually enjoy
              </div>
              <h2 className="text-4xl font-bold leading-tight tracking-tight md:text-5xl">
                Design, test &amp; ship
                <br />
                <span className="bg-gradient-to-r from-[#ff5b1f] via-[#ffb400] to-[#1fbf9a] bg-clip-text text-transparent">
                  reliable APIs
                </span>{' '}
                — together.
              </h2>
              <p className="mt-3 max-w-md text-base text-white/65">
                Collections, MCP servers, mocks, functional tests, load runs and
                live monitors — all in one workspace, hardened for production demos.
              </p>
            </div>

            <ul className="grid max-w-md grid-cols-1 gap-3 sm:grid-cols-2">
              {HIGHLIGHTS.map(({ icon: Icon, title: t, desc }) => (
                <li
                  key={t}
                  className="group rounded-xl border border-white/10 bg-white/[0.03] p-3 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-[#ff5b1f]/40 hover:bg-white/[0.06]"
                >
                  <div className="mb-1.5 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#ff5b1f]/25 to-[#1fbf9a]/25">
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <div className="text-sm font-semibold text-white">{t}</div>
                  <div className="text-xs text-white/55">{desc}</div>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-center gap-4 text-xs text-white/45">
            <span>© ProbeStack 2026</span>
            <span className="h-1 w-1 rounded-full bg-white/30" />
            <Link to="/pricing" className="hover:text-white/80">Pricing</Link>
            <span className="h-1 w-1 rounded-full bg-white/30" />
            <a href="/docs/customer-api-v1" className="hover:text-white/80">Docs</a>
          </div>
        </aside>

        {/* === RIGHT: form card ===================================== */}
        <main className="flex items-center justify-center p-6 sm:p-10">
          <div
            data-testid="auth-card"
            className="w-full max-w-[440px] rounded-2xl border border-white/10 bg-[#13161d]/85 p-7 shadow-[0_30px_80px_-30px_rgba(255,91,31,0.35)] backdrop-blur-2xl sm:p-9"
          >
            {/* Mobile logo — only when left pane is hidden */}
            <Link
              to="/"
              data-testid="auth-logo-mobile"
              className="mb-6 inline-flex items-center gap-2 lg:hidden"
            >
              <Logo variant="mark" className="h-10 w-8" />
              <span className="bg-gradient-to-r from-[#ff5b1f] to-[#1fbf9a] bg-clip-text text-xl font-bold text-transparent">
                ForgeFuzz
              </span>
            </Link>

            {/* Tab toggle */}
            <div
              role="tablist"
              data-testid="auth-mode-tabs"
              className="mb-7 grid grid-cols-2 rounded-lg border border-white/10 bg-white/[0.03] p-1"
            >
              {(['signin', 'signup'] as Mode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="tab"
                  aria-selected={mode === m}
                  data-testid={m === 'signin' ? 'auth-tab-signin' : 'auth-tab-signup'}
                  onClick={() => setMode(m)}
                  className={cn(
                    'rounded-md px-3 py-2 text-sm font-medium transition-all',
                    mode === m
                      ? 'bg-gradient-to-r from-[#ff5b1f] to-[#ff8c4a] text-white shadow-lg shadow-[#ff5b1f]/20'
                      : 'text-white/55 hover:text-white',
                  )}
                >
                  {m === 'signin' ? 'Sign in' : 'Create account'}
                </button>
              ))}
            </div>

            <h1 className="text-2xl font-bold text-white">{title}</h1>
            <p className="mt-1 text-sm text-white/55">{subtitle}</p>

            {/* OAuth row (stub buttons — wired in Phase 1) */}
            <div className="mt-6 grid grid-cols-2 gap-2.5">
              <OAuthButton testid="auth-oauth-google" label="Google" iconUrl="https://www.google.com/favicon.ico" />
              <OAuthButton testid="auth-oauth-github" label="GitHub" icon={<Github className="h-4 w-4" />} />
            </div>

            <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-[0.18em] text-white/35">
              <span className="h-px flex-1 bg-white/10" />
              or with email
              <span className="h-px flex-1 bg-white/10" />
            </div>

            <form data-testid="auth-form" onSubmit={onSubmit} className="space-y-3.5">
              {mode === 'signup' && (
                <>
                  <Field
                    icon={UserIcon}
                    testid="auth-input-name"
                    placeholder="Full name"
                    value={form.name}
                    onChange={onChange('name')}
                    required
                  />
                  <Field
                    icon={Boxes}
                    testid="auth-input-company"
                    placeholder="Company / Team (optional)"
                    value={form.company}
                    onChange={onChange('company')}
                  />
                </>
              )}

              <Field
                icon={Mail}
                testid="auth-input-email"
                type="email"
                placeholder="you@company.com"
                value={form.email}
                onChange={onChange('email')}
                required
                autoComplete="email"
              />

              <Field
                icon={Lock}
                testid="auth-input-password"
                type={showPwd ? 'text' : 'password'}
                placeholder={mode === 'signup' ? 'Create a strong password' : 'Password'}
                value={form.password}
                onChange={onChange('password')}
                required
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                trailing={
                  <button
                    type="button"
                    data-testid="auth-toggle-password"
                    onClick={() => setShowPwd((p) => !p)}
                    className="text-white/45 hover:text-white"
                    aria-label={showPwd ? 'Hide password' : 'Show password'}
                  >
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
              />

              {mode === 'signin' ? (
                <div className="flex items-center justify-between pt-1 text-[12px]">
                  <label className="inline-flex cursor-pointer items-center gap-2 text-white/60">
                    <input
                      type="checkbox"
                      data-testid="auth-remember"
                      checked={form.remember}
                      onChange={onChange('remember')}
                      className="h-3.5 w-3.5 rounded border-white/20 bg-white/5 accent-[#ff5b1f]"
                    />
                    Remember me
                  </label>
                  <button
                    type="button"
                    data-testid="auth-forgot-password"
                    className="text-[#ff8c4a] hover:text-[#ffb400]"
                  >
                    Forgot password?
                  </button>
                </div>
              ) : (
                <p className="pt-1 text-[11px] leading-relaxed text-white/45">
                  By creating an account you agree to ForgeFuzz's
                  {' '}
                  <a href="/terms" className="text-white/70 hover:text-white">Terms</a>
                  {' '}and{' '}
                  <a href="/privacy" className="text-white/70 hover:text-white">Privacy</a>.
                </p>
              )}

              <button
                type="submit"
                data-testid="auth-submit-btn"
                disabled={submitting}
                className="group mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#ff5b1f] to-[#ff8c4a] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#ff5b1f]/25 transition-all hover:shadow-[#ff5b1f]/45 disabled:opacity-60"
              >
                {submitting ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-transparent" />
                ) : (
                  <>
                    {mode === 'signin' ? 'Sign in' : 'Create account'}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </button>

              <button
                type="button"
                data-testid="auth-skip-btn"
                onClick={onSkip}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-white/70 transition-all hover:border-[#1fbf9a]/40 hover:text-white"
              >
                <Rocket className="h-4 w-4 text-[#1fbf9a]" />
                Continue to demo workspace
              </button>
            </form>

            <p className="mt-6 text-center text-xs text-white/45">
              {mode === 'signin' ? (
                <>
                  Don't have an account?{' '}
                  <button
                    type="button"
                    data-testid="auth-switch-signup"
                    onClick={() => setMode('signup')}
                    className="font-medium text-[#ffb400] hover:text-[#ff8c4a]"
                  >
                    Create one →
                  </button>
                </>
              ) : (
                <>
                  Already on ForgeFuzz?{' '}
                  <button
                    type="button"
                    data-testid="auth-switch-signin"
                    onClick={() => setMode('signin')}
                    className="font-medium text-[#ffb400] hover:text-[#ff8c4a]"
                  >
                    Sign in →
                  </button>
                </>
              )}
            </p>
          </div>
        </main>
      </div>
    </div>
  );
};

// ============================================================
// Small private primitives — kept local to avoid public API churn
// ============================================================

const Field = ({
  icon: Icon,
  testid,
  trailing,
  ...rest
}: {
  icon: any;
  testid: string;
  trailing?: React.ReactNode;
} & React.InputHTMLAttributes<HTMLInputElement>) => (
  <div className="group relative flex items-center rounded-lg border border-white/10 bg-white/[0.03] transition-all focus-within:border-[#ff5b1f]/55 focus-within:bg-white/[0.06]">
    <Icon className="ml-3 h-4 w-4 shrink-0 text-white/40 transition-colors group-focus-within:text-[#ff8c4a]" />
    <input
      {...rest}
      data-testid={testid}
      className="flex-1 bg-transparent px-3 py-2.5 text-sm text-white placeholder-white/35 outline-none"
    />
    {trailing && <div className="mr-3">{trailing}</div>}
  </div>
);

const OAuthButton = ({
  testid,
  label,
  icon,
  iconUrl,
}: {
  testid: string;
  label: string;
  icon?: React.ReactNode;
  iconUrl?: string;
}) => (
  <button
    type="button"
    data-testid={testid}
    className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] py-2.5 text-sm font-medium text-white/80 transition-all hover:border-white/25 hover:bg-white/[0.06] hover:text-white"
  >
    {iconUrl ? (
      <img src={iconUrl} alt="" className="h-4 w-4 rounded-sm" />
    ) : (
      icon
    )}
    {label}
  </button>
);