// @ts-nocheck — legacy landing component ported 1:1 from the approved zip.
import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Rocket, Terminal } from 'lucide-react';
import { toast } from 'sonner';
import { bootstrapUser } from '@/services/user.service';
import StartTestingModal from '../modals/StartTestingModal';
import AnimatedTerminal from './AnimatedTerminal';
const API_LINES = [
  { method: 'POST', endpoint: '/api/v1/users', status: '201', time: '45ms', ok: true },
  { method: 'GET', endpoint: '/api/v1/products', status: '200', time: '32ms', ok: true },
  { method: 'PUT', endpoint: '/api/v1/orders/42', status: '200', time: '67ms', ok: true },
  { method: 'DELETE', endpoint: '/api/v1/sessions/8', status: '204', time: '28ms', ok: true },
  { method: 'GET', endpoint: '/api/v1/analytics', status: '200', time: '156ms', ok: true },
  { method: 'PATCH', endpoint: '/api/v1/config', status: '200', time: '89ms', ok: true },
  { method: 'GET', endpoint: '/api/v1/health', status: '200', time: '12ms', ok: true },
  { method: 'POST', endpoint: '/api/v1/webhooks', status: '201', time: '94ms', ok: true },
];
function TerminalAnimation() {
  const [visibleLines, setVisibleLines] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const containerRef = useRef(null);
  useEffect(() => {
    if (currentIdx >= API_LINES.length) {
      const timer = setTimeout(() => {
        setVisibleLines([]);
        setCurrentIdx(0);
      }, 3000);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => {
      setVisibleLines(prev => [...prev, API_LINES[currentIdx]]);
      setCurrentIdx(prev => prev + 1);
    }, 600 + Math.random() * 400);
    return () => clearTimeout(timer);
  }, [currentIdx]);
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [visibleLines]);
  // Theme-aware method colors using CSS variables
  const methodColor = (m: string) => {
    const colors: Record<string, string> = {
      GET: 'var(--color-method-get, #22c55e)',
      POST: 'var(--color-method-post, #f59e0b)',
      PUT: 'var(--color-method-put, #3b82f6)',
      DELETE: 'var(--color-method-delete, #ef4444)',
      PATCH: 'var(--color-method-patch, #a855f7)',
      OPTIONS: 'var(--color-method-options, #64748b)',
    };
    return colors[m] || 'var(--color-text-muted)';
  };
  return (
    <div data-testid="terminal-animation" className="w-full max-w-6xl mx-auto mt-12">
      <div className="rounded-xl overflow-hidden border border-border shadow-2xl shadow-black/20 dark:shadow-black/40 ring-1 ring-primary/10 hover:ring-primary/30 transition-all duration-500">
        {/* Terminal Header */}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-surface border-b border-border">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
          <div className="flex items-center gap-1.5 ml-3 text-xs text-text-muted">
            <Terminal className="w-3 h-3" />
            <span className="font-mono">ForgeFuzz ~ api-runner</span>
          </div>
        </div>
        {/* Terminal Body */}
        <div
          ref={containerRef}
          className="bg-elevated p-4 h-[350px] overflow-y-auto font-mono text-xs leading-relaxed"
        >
          <div className="text-text-muted mb-2">$ ForgeFuzz run --suite integration-tests</div>
          {visibleLines.map((line, i) => (
            <div
              key={i}
              className="flex items-center gap-2 animate-fade-in-up"
              style={{ animationDuration: '0.3s' }}
            >
              <span className="text-text-muted w-6 text-right">{String(i + 1).padStart(2, '0')}</span>
              <span className="font-bold w-16" style={{ color: methodColor(line.method) }}>
                {line.method}
              </span>
              <span className="text-text-primary flex-1 truncate">{line.endpoint}</span>
              <span className="text-text-muted mx-1">&rarr;</span>
              <span className={line.ok ? 'text-success' : 'text-danger'}>{line.status}</span>
              <span className="text-text-muted w-14 text-right">{line.time}</span>
            </div>
          ))}
          {currentIdx < API_LINES.length && (
            <div
              className="inline-block w-0.5 h-4 ml-6 mt-1"
              style={{
                backgroundColor: 'var(--color-primary)',
                animation: 'typewriter-blink 1s step-end infinite',
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
function RocketButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  const [isHovered, setIsHovered] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const handleClick = useCallback(() => {
    if (isLaunching) return;
    setIsLaunching(true);
    setTimeout(() => {
      onClick?.();
      setTimeout(() => setIsLaunching(false), 200);
    }, 600);
  }, [isLaunching, onClick]);
  return (
    <button
      data-testid="start-testing-btn"
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative inline-flex items-center justify-center gap-3 h-14 px-8 py-3 text-base font-semibold rounded-md bg-primary text-white shadow-lg transition-all duration-300 overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
      disabled={isLaunching}
    >
      <div
        className={`absolute inset-0 transition-opacity duration-300 ${
          isHovered && !isLaunching ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <div className="relative z-10 flex items-center gap-2">
        <Rocket
          className={`w-5 h-5 transition-all duration-300 ${
            isHovered && !isLaunching ? 'rocket-icon-hover' : ''
          } ${isLaunching ? 'rocket-icon-launch' : ''}`}
          style={{ transform: isLaunching ? 'rotate(-45deg)' : 'rotate(0deg)' }}
        />
      </div>
      <span
        className={`relative z-10 transition-opacity duration-300 ${
          isLaunching ? 'opacity-0' : 'opacity-100'
        }`}
      >
        {children}
      </span>
      {isLaunching && (
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-white animate-ping"
              style={{
                left: `${30 + i * 10}%`,
                top: `${50 + i * 5}%`,
                animationDelay: `${i * 0.1}s`,
                animationDuration: '0.5s',
              }}
            />
          ))}
        </div>
      )}
    </button>
  );
}
export default function HeroSection() {
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const prefill =
    new URL(window.location.href).searchParams.get('email') ||
    localStorage.getItem('userEmail') ||
    'admin@forgecrux.com';
  const handleBootstrap = async (email: string) => {
    const cached = localStorage.getItem('userEmail');
    const toastId = toast.loading('Syncing your account…');
    try {
      const u = await bootstrapUser(email);
      toast.success(`Welcome, ${u.name || u.email}`, { id: toastId });
      window.location.href = '/workspace';
      window.location.href = '/projects';
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not sync account', {
        id: toastId,
        duration: 6000,
      });
      if (cached && localStorage.getItem('userId') && cached.toLowerCase() === email.toLowerCase()) {
        setTimeout(() => {
          window.location.href = '/workspace';
          window.location.href = '/projects';
        }, 1200);
      } else {
        throw err;
      }
    }
  };
  return (
    <section
      data-testid="hero-section"
      className="relative z-10 shrink-0 overflow-hidden border-b border-border"
    >
      <div className="absolute inset-0 grid-pattern opacity-30 dark:opacity-50" />
      <div className="w-full px-6 sm:px-10 lg:px-16 xl:px-24 py-10 relative mt-16 sm:mt-10 md:mt-4 lg:mt-2">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 backdrop-blur-sm text-primary rounded-full text-sm font-medium mb-6 border border-primary/20 shadow-lg shadow-primary/5 animate-fade-in-up">
            <Zap className="w-4 h-4" />
            The API lifecycle platform - built for shipping teams
          </div>
          <h1
            data-testid="hero-title"
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 animate-fade-in-up animation-delay-100 gradient-text font-display leading-[1.05] tracking-tight mt-2 lg:mt-0"
          >
            The API platform that ships with its own QA team.
          </h1>
          <p className="text-md md:text-lg text-text-secondary mb-3 max-w-2xl mx-auto animate-fade-in-up animation-delay-200 leading-relaxed">
            Design, mock, test, monitor, secure and document every API - from spec to incident response - in one workspace.
            Design, mock, test, monitor, secure and document every API - from spec to incident response - in one collaborative project.
          </p>
          <p className="text-xs md:text-sm text-text-muted mb-8 max-w-2xl mx-auto animate-fade-in-up animation-delay-200 font-mono">
             production microservices · SOC2-ready audit trail · powered by ForgeFuzz
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 animate-fade-in-up animation-delay-300">
            <RocketButton onClick={() => navigate('/login')}>
              Start free →
            </RocketButton>
            <a
              href="#pillars"
              data-testid="hero-secondary-cta"
              className="inline-flex items-center justify-center gap-2 h-14 px-6 py-3 text-base font-medium rounded-md border border-border bg-surface/40 backdrop-blur hover:border-primary/50 hover:text-primary text-text-primary transition-colors"
            >
              See our pillars
            </a>
          </div>
        </div>
        <div className="animate-fade-in-up animation-delay-500  px-0 sm:px-0 md:px-10 lg:px-16 xl:px-24 mt-16 sm:mt-12 md:mt-10 lg:mt-8">
          {/* <TerminalAnimation /> */}
          <AnimatedTerminal/>
        </div>
      </div>
      <StartTestingModal
        open={modalOpen}
        initialEmail={prefill}
        onSubmit={handleBootstrap}
        onClose={() => setModalOpen(false)}
      />
    </section>
  );
}