/**
 * Auth Page — Sign In / Sign Up.
 *
 * Two-pane experience tuned to ForgeFuzz's existing dark theme:
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
 * Theme: carries the active dark/light theme from settings.store
 *   (so the landing page → login transition stays consistent), and a
 *   floating Sun/Moon button lets the user flip themes in-place without
 *   bouncing back to the workspace header.
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
  Moon,
  Sun,
  Building2,
  CheckCircle2,
  User,
  LogIn,
  UserPlus,
} from 'lucide-react';
import { Logo } from '@/components/common/Logo';
import { useSettings } from '@/stores/settings.store';
import { useAuth } from '@/stores/auth.store';
import { userMgmtService } from '@/services/userMgmt.service';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, auth ,GoogleAuthProvider, GithubAuthProvider, signInWithPopup, } from '@/lib/firebase';
import { cn } from '@/utils/cn';

type Mode = 'signin' | 'signup';
type Audience = 'individual' | 'enterprise';

const HIGHLIGHTS = [
  { icon: Boxes,       title: '32 + MCP servers',   desc: 'Catalog · health · audit trail' },
  { icon: TestTube2,   title: 'Functional + Load',  desc: 'p50/p95 charts · live SSE runs'  },
  { icon: ShieldCheck, title: 'API Governance',     desc: 'Spec drift · security gates'     },
  { icon: Activity,    title: 'Real-time Monitors', desc: '99.94 % observed uptime'         },
];

// ---------- Canvas particle field (dots + link lines) ----------
const CanvasParticles = ({ isDark }: { isDark: boolean }) => {
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
    const colors = isDark
      ? ["#ff4400", "#1e00ff", "#00ff33"]
      : ["#ff5b1f", "#1fbf9a", "#ffb400"];
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

    // Pick the link-line colour to match the current theme so the
    // particle web stays visible (white-on-dark, black-on-light).
    const linkRgb = isDark ? '255,255,255' : '17,24,39';

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
        ctx.globalAlpha = isDark ? 0.65 : 0.55;
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
            ctx.strokeStyle = `rgba(${linkRgb},${(isDark ? 0.16 : 0.12) * (1 - d2 / (120 * 120))})`;
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
  }, [isDark]);

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
  // Allow deep-link via either `?mode=signup` OR the `/register` route
  // (router maps both `/login` and `/register` to this component).
  const onRegisterRoute = typeof window !== 'undefined' && window.location.pathname.startsWith('/register');
  const initialMode: Mode = params.get('mode') === 'signup' || onRegisterRoute ? 'signup' : 'signin';

  // Inherit whichever theme the user was on (landing / workspace / direct
  // link). The settings store already mounts <html data-theme> on boot,
  // we simply derive `isDark` for the conditional palette and expose a
  // floating Sun/Moon toggle so the user can flip themes WITHOUT leaving
  // this screen.
  const theme = useSettings((s) => s.theme);
  const setTheme = useSettings((s) => s.setTheme);
  const isDark = theme === 'dark';

  const [mode, setMode] = useState<Mode>(initialMode);
  const [audience, setAudience] = useState<Audience>('individual'); // NEW
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg]   = useState<string | null>(null);
  const setSession = useAuth((s) => s.setSession);
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
  setErrorMsg(null);
  setInfoMsg(null);
  setSubmitting(true);
  try {
    if (mode === 'signup') {
      // Signup flow
      const userCred = await createUserWithEmailAndPassword(auth, form.email.trim(), form.password);
      const firebaseUser = userCred.user;
      const uid = firebaseUser.uid;

      await userMgmtService.register({
        userId: uid,
        email: form.email.trim(),
        firstName: form.name.trim() || undefined,
        lastName: undefined,
      });

      setInfoMsg('Account created — check your inbox for the verification link, then sign in.');
      setMode('signin');
      return;
    }

    // Signin flow
    const userCred = await signInWithEmailAndPassword(auth, form.email.trim(), form.password);
    const firebaseUser = userCred.user;
    const idToken = await firebaseUser.getIdToken();

    const payload = JSON.parse(atob(idToken.split('.')[1]));
    const expiresInSec = payload.exp - Math.floor(Date.now() / 1000);

    const user = await userMgmtService.me(idToken);

    useAuth.getState().setSession({
      accessToken: idToken,
      refreshToken: '',
      expiresInSec,
      user,
    });

    const next = params.get('next');
    nav(next && next.startsWith('/') ? decodeURIComponent(next) : '/projects/collections');
  } catch (err: any) {
    // 🔥 NEW: Hide all Firebase auth errors behind a single generic message
    if (err.code && err.code.startsWith('auth/')) {
      setErrorMsg('Invalid email or password. Please try again.');
    } else {
      // Network or other unexpected errors – still show a generic message
      setErrorMsg(err?.message || 'Authentication failed. Please try again.');
    }
  } finally {
    setSubmitting(false);
  }
};

const handleOAuthLogin = async (provider: GoogleAuthProvider | GithubAuthProvider) => {
  setErrorMsg(null);
  setInfoMsg(null);
  setSubmitting(true);
  try {
    const result = await signInWithPopup(auth, provider);
    const firebaseUser = result.user;
    const idToken = await firebaseUser.getIdToken();

    // Try to fetch user from backend – auto‑register if 404
    let user;
    try {
      user = await userMgmtService.me(idToken);
    } catch (err: any) {
      if (err?.response?.status === 404) {
        await userMgmtService.register({
          userId: firebaseUser.uid,
          email: firebaseUser.email ?? '',
          firstName: firebaseUser.displayName ?? firebaseUser.email?.split('@')[0] ?? 'User',
          lastName: undefined,
        });
        user = await userMgmtService.me(idToken);
      } else {
        throw err;
      }
    }

    const payload = JSON.parse(atob(idToken.split('.')[1]));
    const expiresInSec = payload.exp - Math.floor(Date.now() / 1000);

    useAuth.getState().setSession({
      accessToken: idToken,
      refreshToken: '',
      expiresInSec,
      user,
    });

    nav('/projects/collections');
  } catch (err: any) {
console.error('OAuth error:', err); // <-- ADD THIS
if (err.code && err.code.startsWith('auth/')) {
  setErrorMsg('OAuth sign-in failed. Please try again.');
} else {
  setErrorMsg(err?.message || 'Authentication failed.');
}
  } finally {
    setSubmitting(false);
  }
};

  const onSkip = () => nav('/projects/collections');

  return (
    <div
      data-testid="auth-page"
      className={cn(
        'relative min-h-screen w-full overflow-hidden transition-colors duration-300',
        isDark ? 'bg-[#0b0d12] text-white' : 'bg-[#f6f7fb] text-[#1f2937]',
      )}
    >
      {/* Inject keyframes for rising particles */}
      <style>{particleRiseStyles}</style>

      {/* Floating theme toggle — top-right, mirrors the workspace header
          control so the user keeps the same affordance everywhere. */}
      <button
        type="button"
        onClick={() => setTheme(isDark ? 'light' : 'dark')}
        data-testid="auth-theme-toggle"
        aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
        title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
        className={cn(
          'absolute right-5 top-5 z-30 inline-flex h-9 w-9 items-center justify-center rounded-full border backdrop-blur transition-all',
          isDark
            ? 'border-white/15 bg-white/[0.06] text-white hover:border-[#ff5b1f]/45 hover:bg-white/[0.1]'
            : 'border-black/10 bg-white/70 text-[#1f2937] hover:border-[#ff5b1f]/55 hover:bg-white',
        )}
      >
        {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>

      {/* Ambient gradient orbs — reuse landing palette so brand stays consistent */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <div
          className={cn(
            'absolute -left-1/4 -top-1/4 h-[60%] w-[60%] animate-pulse rounded-full blur-[140px]',
            isDark ? 'bg-[#ff5b1f]/25' : 'bg-[#ff5b1f]/18',
          )}
        />
        <div
          className={cn(
            'absolute -bottom-1/4 -right-1/4 h-[55%] w-[55%] animate-pulse rounded-full blur-[140px]',
            isDark ? 'bg-[#1fbf9a]/20' : 'bg-[#1fbf9a]/14',
          )}
          style={{ animationDelay: '1.5s' }}
        />
        <div
          className={cn(
            'absolute inset-0',
            isDark
              ? 'opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.6)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.6)_1px,transparent_1px)] [background-size:48px_48px]'
              : 'opacity-[0.06] [background-image:linear-gradient(rgba(0,0,0,0.6)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.6)_1px,transparent_1px)] [background-size:48px_48px]',
          )}
        />
      </div>

      {/* Canvas particle field with dynamic connecting lines */}
      <CanvasParticles isDark={isDark} />

      {/* CSS rising particles (logos + bubbles) */}
      {/* <CSSParticles /> */}

      <div className="relative z-10 mx-auto grid min-h-screen w-full max-w-[1400px] grid-cols-1 lg:grid-cols-[1.05fr_1fr]">
        {/* === LEFT: brand / value panel ============================ */}
        <aside
          data-testid="auth-brand-panel"
          className="hidden flex-col justify-between p-10 lg:flex lg:p-14"
        >
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
                <div className="font-bold  text-2xl tracking-normal leading-tight gradient-text">
                  ForgeFuzz
                </div>
              </div>
            </Link>

          <div className="space-y-8">
            <div>
              <div
                className={cn(
                  'mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs',
                  isDark ? 'border-white/10 bg-white/[0.04] text-white/70' : 'border-black/10 bg-white/70 text-gray-700',
                )}
              >
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
              <p className={cn('mt-3 max-w-md text-base', isDark ? 'text-white/65' : 'text-gray-600')}>
                Collections, MCP servers, mocks, functional tests, load runs and
                live monitors — all in one workspace, hardened for production demos.
              </p>
            </div>

            <ul className="grid max-w-md grid-cols-1 gap-3 sm:grid-cols-2">
              {HIGHLIGHTS.map(({ icon: Icon, title: t, desc }) => (
                <li
                  key={t}
                  className={cn(
                    'group rounded-xl border p-3 backdrop-blur-sm transition-all hover:-translate-y-0.5',
                    isDark
                      ? 'border-white/10 bg-white/[0.03] hover:border-[#ff5b1f]/40 hover:bg-white/[0.06]'
                      : 'border-black/10 bg-white/70 hover:border-[#ff5b1f]/50 hover:bg-white',
                  )}
                >
                  <div className="mb-1.5 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#ff5b1f]/25 to-[#1fbf9a]/25">
                    <Icon className={cn('h-4 w-4', isDark ? 'text-white' : 'text-gray-800')} />
                  </div>
                  <div className={cn('text-sm font-semibold', isDark ? 'text-white' : 'text-gray-900')}>{t}</div>
                  <div className={cn('text-xs', isDark ? 'text-white/55' : 'text-gray-500')}>{desc}</div>
                </li>
              ))}
            </ul>
          </div>

          <div className={cn('flex items-center gap-4 text-xs', isDark ? 'text-white/45' : 'text-gray-500')}>
            <span>© ProbeStack 2026</span>
            <span className={cn('h-1 w-1 rounded-full', isDark ? 'bg-white/30' : 'bg-black/30')} />
            <Link to="/pricing" className={isDark ? 'hover:text-white/80' : 'hover:text-gray-800'}>Pricing</Link>
            <span className={cn('h-1 w-1 rounded-full', isDark ? 'bg-white/30' : 'bg-black/30')} />
            <a href="/docs/customer-api-v1" className={isDark ? 'hover:text-white/80' : 'hover:text-gray-800'}>Docs</a>
          </div>
        </aside>

        {/* === RIGHT: form card ===================================== */}
        <main className="flex items-center justify-center p-6 sm:p-10">
          <div
            data-testid="auth-card"
            className={cn(
              'w-full max-w-[440px] rounded-2xl border p-7 shadow-[0_30px_80px_-30px_rgba(255,91,31,0.35)] backdrop-blur-2xl sm:p-9',
              isDark ? 'border-white/10 bg-[#13161d]/85' : 'border-black/10 bg-white/85',
            )}
          >
            {/* Mobile logo — only when left pane is hidden */}
                <Link
                  to="/"
                  data-testid="auth-logo-mobile"
                  className="mb-6 inline-flex items-center gap-2 lg:hidden"
                >
                  <Logo variant="mark" className="h-12 w-10" />
              <div className="text-left">
                <div className="text-[0.8rem] text-text-secondary tracking-normal leading-tight mb-[-2px]">
                  ProbeStack
                </div>
                <div className="font-bold  text-2xl tracking-normal leading-tight gradient-text">
                  ForgeFuzz
                </div>
              </div>
                </Link>

            {/* --- NEW: Audience toggle (Individual / Enterprise) --- */}
            <AudienceToggle
              isDark={isDark}
              value={audience}
              onChange={setAudience}
            />

            

            {/* --- Conditional content --- */}
            {audience === 'individual' ? (
              <>
                

                {/* Tab toggle */}
                {/* <div
                  role="tablist"
                  data-testid="auth-mode-tabs"
                  className={cn(
                    'mb-7 grid grid-cols-2 rounded-lg border p-1',
                    isDark ? 'border-white/10 bg-white/[0.03]' : 'border-black/10 bg-black/[0.04]',
                  )}
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
                          : isDark
                            ? 'text-white/55 hover:text-white'
                            : 'text-gray-500 hover:text-gray-900',
                      )}
                    >
                      {m === 'signin' ? 'Sign in' : 'Create account'}
                    </button>
                  ))}
                </div> */}

                <h1 className={cn('text-2xl font-bold', isDark ? 'text-white' : 'text-gray-900')}>{title}</h1>
                <p className={cn('mt-1 text-sm', isDark ? 'text-white/55' : 'text-gray-500')}>{subtitle}</p>

                {/* OAuth row (stub buttons) */}
<div className="mt-6 grid grid-cols-2 gap-2.5">
  <OAuthButton 
    testid="auth-oauth-google" 
    label="Google" 
    iconUrl="https://www.google.com/favicon.ico" 
    isDark={isDark} 
    onClick={() => handleOAuthLogin(new GoogleAuthProvider())} 
  />
  <OAuthButton 
    testid="auth-oauth-github" 
    label="GitHub" 
    icon={<Github className="h-4 w-4" />} 
    isDark={isDark} 
    onClick={() => handleOAuthLogin(new GithubAuthProvider())} 
  />
</div>

                <div
                  className={cn(
                    'my-5 flex items-center gap-3 text-[11px] uppercase tracking-[0.18em]',
                    isDark ? 'text-white/35' : 'text-gray-400',
                  )}
                >
                  <span className={cn('h-px flex-1', isDark ? 'bg-white/10' : 'bg-black/10')} />
                  or with email
                  <span className={cn('h-px flex-1', isDark ? 'bg-white/10' : 'bg-black/10')} />
                </div>

                <form data-testid="auth-form" onSubmit={onSubmit} className="space-y-3.5">
                  {/* Status banners — info (post-signup) + error (server-rejected). */}
                  {infoMsg && (
                    <div data-testid="auth-info"
                         className={cn(
                           'rounded-lg border px-3 py-2 text-[12px]',
                           isDark
                             ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                             : 'border-emerald-500/40 bg-emerald-50 text-emerald-800',
                         )}>
                      {infoMsg}
                    </div>
                  )}
                  {errorMsg && (
                    <div data-testid="auth-error"
                         className={cn(
                           'rounded-lg border px-3 py-2 text-[12px]',
                           isDark
                             ? 'border-rose-500/35 bg-rose-500/10 text-rose-200'
                             : 'border-rose-500/40 bg-rose-50 text-rose-700',
                         )}>
                      {errorMsg}
                    </div>
                  )}

                  {mode === 'signup' && (
                    <>
                      <Field
                        icon={UserIcon}
                        testid="auth-input-name"
                        placeholder="Full name"
                        value={form.name}
                        onChange={onChange('name')}
                        required
                        isDark={isDark}
                      />
                      <Field
                        icon={Boxes}
                        testid="auth-input-company"
                        placeholder="Company / Team (optional)"
                        value={form.company}
                        onChange={onChange('company')}
                        isDark={isDark}
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
                    isDark={isDark}
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
                    isDark={isDark}
                    trailing={
                      <button
                        type="button"
                        data-testid="auth-toggle-password"
                        onClick={() => setShowPwd((p) => !p)}
                        className={isDark ? 'text-white/45 hover:text-white' : 'text-gray-400 hover:text-gray-700'}
                        aria-label={showPwd ? 'Hide password' : 'Show password'}
                      >
                        {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    }
                  />

                  {mode === 'signin' ? (
                    <div className="flex items-center justify-between pt-1 text-[12px]">
                      <label className={cn('inline-flex cursor-pointer items-center gap-2', isDark ? 'text-white/60' : 'text-gray-600')}>
                        <input
                          type="checkbox"
                          data-testid="auth-remember"
                          checked={form.remember}
                          onChange={onChange('remember')}
                          className={cn(
                            'h-3.5 w-3.5 rounded accent-[#ff5b1f]',
                            isDark ? 'border-white/20 bg-white/5' : 'border-black/20 bg-white',
                          )}
                        />
                        Remember me
                      </label>
<button
  type="button"
  data-testid="auth-forgot-password"
  onClick={() => nav('/password?mode=forgot')}
  className="text-[#ff8c4a] hover:text-[#ffb400]"
>
  Forgot password?
</button>
                    </div>
                  ) : (
                    <p className={cn('pt-1 text-[11px] leading-relaxed', isDark ? 'text-white/45' : 'text-gray-500')}>
                      By creating an account you agree to our                      {' '}
                      <a href="https://probestack.io/terms-of-service" className={isDark ? 'text-white/70 hover:text-white' : 'text-gray-800 hover:text-gray-900'}>Terms of Service</a>
                      {' '}and{' '}
                      <a href="https://probestack.io/privacy-policy" className={isDark ? 'text-white/70 hover:text-white' : 'text-gray-800 hover:text-gray-900'}>Privacy Policy</a>.
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

                  {/* <button
                    type="button"
                    data-testid="auth-skip-btn"
                    onClick={onSkip}
                    className={cn(
                      'inline-flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all',
                      isDark
                        ? 'border-white/10 bg-white/[0.03] text-white/70 hover:border-[#1fbf9a]/40 hover:text-white'
                        : 'border-black/10 bg-black/[0.03] text-gray-600 hover:border-[#1fbf9a]/55 hover:text-gray-900',
                    )}
                  >
                    <Rocket className="h-4 w-4 text-[#1fbf9a]" />
                    Continue to demo workspace
                  </button> */}
                </form>

                <p className={cn('mt-6 text-center text-xs', isDark ? 'text-white/45' : 'text-gray-500')}>
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
              </>
            ) : (
              /* --- Enterprise redirect panel --- */
              <EnterpriseRedirect
  isDark={isDark}
  onBack={() => setAudience('individual')}
  mode={mode}
  redirectUri={import.meta.env.VITE_CALLBACK_URL || `${window.location.origin}/auth/callback`}
/>
            )}
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
  isDark = true,
  ...rest
}: {
  icon: any;
  testid: string;
  trailing?: React.ReactNode;
  isDark?: boolean;
} & React.InputHTMLAttributes<HTMLInputElement>) => (
  <div
    className={cn(
      'group relative flex items-center rounded-lg border transition-all',
      isDark
        ? 'border-white/10 bg-white/[0.03] focus-within:border-[#ff5b1f]/55 focus-within:bg-white/[0.06]'
        : 'border-black/10 bg-black/[0.03] focus-within:border-[#ff5b1f]/65 focus-within:bg-white',
    )}
  >
    <Icon
      className={cn(
        'ml-3 h-4 w-4 shrink-0 transition-colors group-focus-within:text-[#ff8c4a]',
        isDark ? 'text-white/40' : 'text-gray-400',
      )}
    />
    <input
      {...rest}
      data-testid={testid}
      className={cn(
        'flex-1 bg-transparent px-3 py-2.5 text-sm outline-none',
        isDark ? 'text-white placeholder-white/35' : 'text-gray-900 placeholder-gray-400',
      )}
    />
    {trailing && <div className="mr-3">{trailing}</div>}
  </div>
);

const OAuthButton = ({
  testid,
  label,
  icon,
  iconUrl,
  isDark = true,
  onClick,
}: {
  testid: string;
  label: string;
  icon?: React.ReactNode;
  iconUrl?: string;
  isDark?: boolean;
  onClick?: () => void;
}) => (
  <button
    type="button"
    data-testid={testid}
    onClick={onClick}
    className={cn(
      'inline-flex items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-all',
      isDark
        ? 'border-white/10 bg-white/[0.03] text-white/80 hover:border-white/25 hover:bg-white/[0.06] hover:text-white'
        : 'border-black/10 bg-white/70 text-gray-700 hover:border-black/25 hover:bg-white hover:text-gray-900',
    )}
  >
    {iconUrl ? (
      <img src={iconUrl} alt="" className="h-4 w-4 rounded-sm" />
    ) : (
      icon
    )}
    {label}
  </button>
);

// ============================================================
// NEW: Audience toggle (Individual / Enterprise)
// ============================================================
const AudienceToggle = ({
  isDark,
  value,
  onChange,
}: {
  isDark: boolean;
  value: Audience;
  onChange: (v: Audience) => void;
}) => {

  return (
    <div className="mb-5">
      <div
        className={cn(
          'relative flex rounded-md p-1',
          isDark ? 'bg-white/5 ring-1 ring-white/10' : 'bg-gray-100',
        )}
      >
        <span
          className="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-md border-2 border-[#ff5b1f] bg-[#ff5b1f]/10 transition-all duration-300 ease-out"
          style={{ left: value === 'individual' ? 4 : 'calc(50% + 0px)' }}
        />

        {(['individual', 'enterprise'] as Audience[]).map((v) => {
          const isActive = value === v;
          return (
            <button
              key={v}
              type="button"
              onClick={() => onChange(v)}
              className={cn(
                'relative z-10 flex-1 rounded-sm px-4 py-2 text-sm font-medium transition-colors',
                // Active: primary text, no background (the pill handles that)
                isActive
                  ? 'text-[#ff5b1f]'
                  : isDark
                    ? 'text-white/60 hover:text-white'
                    : 'text-gray-500 hover:text-gray-900',
                // Add icons and gap
                'flex items-center justify-center gap-2',
              )}
            >
              {v === 'individual' ? (
                <User className="h-4 w-4" />
              ) : (
                <Building2 className="h-4 w-4" />
              )}
              {v === 'individual' ? 'Individual' : 'Enterprise'}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ============================================================
// NEW: Enterprise redirect animation (in-card, ~3.4s)
// ============================================================
// const EnterpriseRedirect = ({
//   isDark,
//   onBack,
//   mode,
//   redirectUri,
// }: {
//   isDark: boolean;
//   onBack: () => void;
//   mode: Mode;
//   redirectUri: string;
// }) => {
//   const steps = useMemo(
//     () => [
//       { label: 'Detecting account type', sub: 'Enterprise workspace' },
//       { label: 'Enterprise plan selected', sub: 'Routing to ProbeStack' },
//       {
//         label: 'ForgeFuzz is a ProbeStack product',
//         sub: 'Verifying secure gateway',
//       },
//       { label: `Opening probestack.io/${mode === 'signin' ? 'login' : 'signup'}`, sub: 'Launching new tab…' },
//     ],
//     [mode],
//   );

//   const TOTAL_MS = 3400;
//   const [active, setActive] = useState(0);
//   const [progress, setProgress] = useState(0);
//   const [opened, setOpened] = useState(false);

//   useEffect(() => {
//     const start = performance.now();
//     let raf = 0;
//     const tick = (t: number) => {
//       const p = Math.min(1, (t - start) / TOTAL_MS);
//       setProgress(p);
//       setActive(Math.min(steps.length - 1, Math.floor(p * steps.length)));
//       if (p < 1) raf = requestAnimationFrame(tick);
//     };
//     raf = requestAnimationFrame(tick);

//     const baseUrl = 'https://probestack.io';
//     const path = mode === 'signin' ? '/login' : '/signup';
//     let url = `${baseUrl}${path}`;
// if (mode === 'signin') {
//   url += `?redirect_uri=${encodeURIComponent(redirectUri)}`;
// }

//     const redirect = window.setTimeout(() => {
//       window.open(url, '_blank', 'noopener,noreferrer');
//       setOpened(true);
//     }, TOTAL_MS);

//     return () => {
//       cancelAnimationFrame(raf);
//       window.clearTimeout(redirect);
//     };
//   }, [steps.length, mode, redirectUri]);

//   return (
//     <div className="flex flex-col pt-2">
//       <div className="relative mx-auto mt-4 h-24 w-24">
//         <div className="absolute inset-0 animate-ping rounded-full bg-[#ff5b1f]/25" />
//         <div className="absolute inset-2 rounded-full bg-gradient-to-br from-[#ff5b1f] via-[#ffb400] to-[#1fbf9a] shadow-2xl shadow-[#ff5b1f]/40" />
//         <div className="absolute inset-0 flex items-center justify-center">
//           <Building2 className="h-10 w-10 text-white" />
//         </div>
//       </div>

//       <h2 className="mt-5 text-center text-xl font-semibold tracking-tight">
//         Routing to Enterprise
//       </h2>
//       <p
//         className={cn(
//           'mx-auto mt-1 max-w-xs text-center text-sm',
//           isDark ? 'text-white/60' : 'text-gray-500',
//         )}
//       >
//         ForgeFuzz Enterprise is provisioned via{' '}
//         <span className="font-medium text-[#ffb400]">probestack.io</span>
//       </p>

//       <ul className="mt-5 space-y-2">
//         {steps.map((s, i) => {
//           const done = i < active;
//           const current = i === active;
//           return (
//             <li
//               key={s.label}
//               className={cn(
//                 'flex items-center gap-3 rounded-lg border px-3 py-2 transition-all duration-300',
//                 current
//                   ? isDark
//                     ? 'border-[#ff5b1f]/40 bg-[#ff5b1f]/10'
//                     : 'border-[#ff5b1f]/40 bg-[#ff5b1f]/5'
//                   : isDark
//                     ? 'border-white/5 bg-white/[0.02]'
//                     : 'border-gray-200 bg-white',
//               )}
//               style={{
//                 opacity: i > active ? 0.45 : 1,
//                 transform: current ? 'translateX(2px)' : 'translateX(0)',
//               }}
//             >
//               <span
//                 className={cn(
//                   'flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold',
//                   done
//                     ? 'bg-emerald-500 text-white'
//                     : current
//                       ? 'bg-gradient-to-br from-[#ff5b1f] to-[#ff8c4a] text-white animate-bounce'
//                       : isDark
//                         ? 'bg-white/10 text-white/60'
//                         : 'bg-gray-200 text-gray-500',
//                 )}
//               >
//                 {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
//               </span>
//               <div className="min-w-0 flex-1">
//                 <p className="truncate text-sm font-medium">{s.label}</p>
//                 <p
//                   className={cn(
//                     'truncate text-[11px]',
//                     isDark ? 'text-white/50' : 'text-gray-500',
//                   )}
//                 >
//                   {s.sub}
//                 </p>
//               </div>
//             </li>
//           );
//         })}
//       </ul>

//       <div
//         className={cn(
//           'mt-5 h-1.5 w-full overflow-hidden rounded-full',
//           isDark ? 'bg-white/10' : 'bg-gray-200',
//         )}
//       >
//         <div
//           className="h-full bg-gradient-to-r from-[#ff5b1f] via-[#ffb400] to-[#1fbf9a] transition-[width] duration-150 ease-linear"
//           style={{ width: `${progress * 100}%` }}
//         />
//       </div>

//       {opened && (
//         <p
//           className={cn(
//             'mt-3 text-center text-[11px]',
//             isDark ? 'text-white/55' : 'text-gray-500',
//           )}
//         >
//           Didn&apos;t open?{' '}
//           <a
//            href={`https://probestack.io/${mode === 'signin' ? 'login' : 'signup'}${mode === 'signin' ? `?redirect_uri=${encodeURIComponent(redirectUri)}` : ''}`}
//             target="_blank"
//             rel="noopener noreferrer" 
//             className="font-medium text-[#ffb400] hover:text-[#ff8c4a]"
//           >
//             Click here
//           </a>
//         </p>
//       )}

//       <button
//         type="button"
//         onClick={onBack}
//         className={cn(
//           'mt-4 self-center text-xs font-medium underline-offset-4 hover:underline',
//           isDark ? 'text-white/60' : 'text-gray-500',
//         )}
//       >
//         ← Back to Individual
//       </button>
//     </div>
//   );
// };

// ============================================================
// Enterprise panel (manual action buttons)
// ============================================================
const EnterpriseRedirect = ({
  isDark,
  onBack,
  mode,
  redirectUri,
}: {
  isDark: boolean;
  onBack: () => void;
  mode: Mode;
  redirectUri: string;
}) => {
  const baseUrl = 'https://probestack.io';
  const loginUrl = `${baseUrl}/login?redirect_uri=${encodeURIComponent(redirectUri)}`;
  const signupUrl = `${baseUrl}/signup`;

  const openUrl = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="flex flex-col items-center pt-2">
      {/* Icon */}
      <div className="relative mx-auto mt-4 h-24 w-24">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#ff5b1f] via-[#ffb400] to-[#1fbf9a] shadow-2xl shadow-[#ff5b1f]/40" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Building2 className="h-10 w-10 text-white" />
        </div>
      </div>

      <h2 className="mt-5 text-center text-xl font-semibold tracking-tight">
        Enterprise Workspace
      </h2>
      <p
        className={cn(
          'mx-auto mt-1 max-w-xs text-center text-sm',
          isDark ? 'text-white/60' : 'text-gray-500',
        )}
      >
        ForgeFuzz Enterprise is provisioned via{' '}
        <span className="font-medium text-[#ff8c4a] hover:text-[#ff8c4a]/70"><a href="https://probestack.io">probestack.io</a></span>
        <br />
        Choose an option below to continue.
      </p>

      <div className="mt-10 w-full space-y-6">
        {/* Login button */}
        <button
          type="button"
          onClick={() => openUrl(loginUrl)}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#ff5b1f] to-[#ff8c4a] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#ff5b1f]/25 transition-all hover:shadow-[#ff5b1f]/45"
        >
          <LogIn className="h-4 w-4" />
          Login to Enterprise
        </button>

        {/* Create account button */}
        <button
          type="button"
          onClick={() => openUrl(signupUrl)}
          className={cn(
            'inline-flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all',
            isDark
              ? 'border-white/10 bg-white/[0.03] text-white/80 hover:border-[#1fbf9a]/40 hover:text-white'
              : 'border-black/10 bg-black/[0.03] text-gray-600 hover:border-[#1fbf9a]/55 hover:text-gray-900',
          )}
        >
          <UserPlus className="h-4 w-4" />
          Create new Enterprise Account
        </button>
      </div>

      {/* Back to Individual button */}
      <button
        type="button"
        onClick={onBack}
        className={cn(
          'mt-6 self-center text-xs font-medium underline-offset-4 hover:underline',
          isDark ? 'text-white/60' : 'text-gray-500',
        )}
      >
        ← Back to Individual
      </button>
    </div>
  );
};