import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Rocket, Terminal } from 'lucide-react';
import { toast } from 'sonner';
import { bootstrapUser } from '../../services/userService';
import StartTestingModal from './StartTestingModal';

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

  const methodColor = (m) => {
    const colors = { GET: '#1fbf9a', POST: '#ffb400', PUT: '#4a9fff', DELETE: '#ff4444', PATCH: '#c084fc', OPTIONS: '#8890aa' };
    return colors[m] || '#9ca3af';
  };

  return (
    <div data-testid="terminal-animation" className="w-full max-w-2xl mx-auto mt-10">
      <div className="rounded-xl overflow-hidden border border-dark-600/50 shadow-2xl shadow-black/40">
        <div className="flex items-center gap-2 px-4 py-2.5 bg-dark-800 border-b border-dark-600/50">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
          <div className="flex items-center gap-1.5 ml-3 text-xs text-dark-400">
            <Terminal className="w-3 h-3" />
            <span className="font-mono">probestack ~ api-runner</span>
          </div>
        </div>
        <div ref={containerRef} className="bg-[#0a0e1a] p-4 h-[280px] overflow-y-auto font-mono text-xs leading-relaxed">
          <div className="text-dark-400 mb-2">$ probestack run --suite integration-tests</div>
          {visibleLines.map((line, i) => (
            <div key={i} className="flex items-center gap-2 animate-fade-in-up" style={{ animationDuration: '0.3s' }}>
              <span className="text-dark-500 w-6 text-right">{String(i + 1).padStart(2, '0')}</span>
              <span className="font-bold w-16" style={{ color: methodColor(line.method) }}>{line.method}</span>
              <span className="text-gray-300 flex-1 truncate">{line.endpoint}</span>
              <span className="text-dark-400 mx-1">&rarr;</span>
              <span className={line.ok ? 'text-green-400' : 'text-red-400'}>{line.status}</span>
              <span className="text-dark-500 w-14 text-right">{line.time}</span>
            </div>
          ))}
          {currentIdx < API_LINES.length && (
            <div className="inline-block w-0.5 h-4 bg-[#ff5b1f] ml-6 mt-1" style={{ animation: 'typewriter-blink 1s step-end infinite' }} />
          )}
        </div>
      </div>
    </div>
  );
}

function RocketButton({ onClick, children }) {
  const [isHovered, setIsHovered] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);

  const handleClick = useCallback(() => {
    if (isLaunching) return;
    setIsLaunching(true);
    setTimeout(() => {
      onClick?.();
      // Reset the launching animation so the button is reusable if the
      // user closes the modal without submitting.
      setTimeout(() => setIsLaunching(false), 200);
    }, 600);
  }, [isLaunching, onClick]);

  return (
    <button
      data-testid="start-testing-btn"
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative inline-flex items-center justify-center gap-3 h-14 px-8 py-3 text-base font-semibold rounded-md bg-primary text-white shadow-lg btn-glow transition-all duration-300 overflow-hidden"
      disabled={isLaunching}
    >
      <div className={`absolute inset-0 transition-opacity duration-300 ${isHovered && !isLaunching ? 'opacity-100' : 'opacity-0'}`} />
      <div className="relative z-10 flex items-center gap-2">
        <Rocket
          className={`w-5 h-5 transition-all duration-300 ${isHovered && !isLaunching ? 'rocket-icon-hover' : ''} ${isLaunching ? 'rocket-icon-launch' : ''}`}
          style={{ transform: isLaunching ? 'rotate(-45deg)' : 'rotate(0deg)' }}
        />
      </div>
      <span className={`relative z-10 transition-opacity duration-300 ${isLaunching ? 'opacity-0' : 'opacity-100'}`}>
        {children}
      </span>
      {isLaunching && (
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-white animate-ping"
              style={{ left: `${30 + i * 10}%`, top: `${50 + i * 5}%`, animationDelay: `${i * 0.1}s`, animationDuration: '0.5s' }}
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

  // Preferred email source on open:
  //   1) ?email=... on URL (parent product deep-links us)
  //   2) userEmail in localStorage (returning visitor)
  //   3) empty — modal's input has its own placeholder
  const prefill =
    new URL(window.location.href).searchParams.get('email') ||
    localStorage.getItem('userEmail') ||
    'admin@forgecrux.com';

  // Called by the modal's onSubmit. Throws on failure so the modal stays
  // open and renders the inline error — catch block lets us distinguish
  // "hard failure" (bad email / ForgeCrux 404) from "transient failure"
  // (network blip) where returning users can still proceed.
  const handleBootstrap = async (email) => {
    const cached = localStorage.getItem('userEmail');
    const toastId = toast.loading('Syncing your account…');
    try {
      const u = await bootstrapUser(email);
      toast.success(`Welcome, ${u.name || u.email}`, { id: toastId });
      // Full reload so every component picks up the new userId / email /
      // role. Guarantees a clean workspace for the new user.
      window.location.href = '/workspace';
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not sync account',
                  { id: toastId, duration: 6000 });
      // Returning users: if they typed the same email that's already
      // cached and they have a valid userId, let them in anyway so a
      // flaky ForgeCrux doesn't block the demo.
      if (cached && localStorage.getItem('userId') &&
          cached.toLowerCase() === email.toLowerCase()) {
        setTimeout(() => { window.location.href = '/workspace'; }, 1200);
      } else {
        throw err; // keep modal open for the user to retry
      }
    }
  };

  return (
    <section data-testid="hero-section" className="relative z-10 shrink-0 overflow-hidden border-b landing-border">
      <div className="absolute inset-0 grid-pattern opacity-50" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#ff5b1f]/10 backdrop-blur-sm text-[#ff5b1f] rounded-full text-sm font-medium mb-6 border border-[#ff5b1f]/20 shadow-lg shadow-[#ff5b1f]/5 animate-fade-in-up">
            <Zap className="w-4 h-4" />
            Production-Grade API Testing
          </div>

          <h1
            data-testid="hero-title"
            className="text-2xl sm:text-4xl md:text-5xl whitespace-nowrap font-bold mb-5 animate-fade-in-up animation-delay-100 gradient-text font-display leading-tight"
          >
            API Testing &amp; Verification Hub
          </h1>

          <p className="text-md md:text-lg landing-text-secondary mb-10 max-w-xl mx-auto animate-fade-in-up animation-delay-200 leading-relaxed">
            Automate your API workflows, verify responses, and collaborate with your team with confidence.
          </p>

          <div className="animate-fade-in-up animation-delay-300">
            <RocketButton onClick={() => setModalOpen(true)}>
              Start Testing
            </RocketButton>
          </div>
        </div>

        <div className="animate-fade-in-up animation-delay-500">
          <TerminalAnimation />
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
