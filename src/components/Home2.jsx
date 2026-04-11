import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Zap,
  Activity,
  Shield,
  Target,
  Box,
  Rocket,
  Sparkles,
  ArrowRight,
  Users,
  Calendar,
  Loader2,
  ChevronDown,
  Flame
} from 'lucide-react';

// ── EDIT THESE 6 VALUES TO CONTROL THE PARTICLES ──────────────────
const PARTICLE_CONFIG = {
  logos:   { count: 12, minSize: 8, maxSize: 25 },
  bubbles: { count: 17, minSize: 4,  maxSize: 10 },
};
// ──────────────────────────────────────────────────────────────────

const ParticleBackground = () => {
  const particles = useMemo(() => {
    const logos = Array.from({ length: PARTICLE_CONFIG.logos.count }, (_, i) => ({
      id: `l${i}`,
      isLogo: true,
      size: PARTICLE_CONFIG.logos.minSize + Math.random() * (PARTICLE_CONFIG.logos.maxSize - PARTICLE_CONFIG.logos.minSize),
      left: `${Math.random() * 100}%`,
      duration: `${12 + Math.random() * 22}s`,
      delay: `-${Math.random() * 25}s`,
      driftX: `${(Math.random() - 0.5) * 80}px`,
      opacity: 0.07 + Math.random() * 0.22,
    }));
    const bubbles = Array.from({ length: PARTICLE_CONFIG.bubbles.count }, (_, i) => ({
      id: `b${i}`,
      isLogo: false,
      size: PARTICLE_CONFIG.bubbles.minSize + Math.random() * (PARTICLE_CONFIG.bubbles.maxSize - PARTICLE_CONFIG.bubbles.minSize),
      left: `${Math.random() * 100}%`,
      duration: `${12 + Math.random() * 22}s`,
      delay: `-${Math.random() * 25}s`,
      driftX: `${(Math.random() - 0.5) * 80}px`,
     opacity: 0.7 + Math.random() * 0.2,
    }));
    return [...logos, ...bubbles];
  }, []);

  return (
    <>
      <style>{`
        @keyframes riseUp {
          0%   { transform: translateY(0) translateX(0px); opacity: 0; }
          5%   { opacity: 1; }
          95%  { opacity: 1; }
          100% { transform: translateY(-120vh) translateX(var(--drift-x)); opacity: 0; }
        }
        .particle-rise {
          position: absolute;
          top: 100%;
          animation: riseUp var(--duration) var(--delay) linear infinite;
          pointer-events: none;
          will-change: transform;
        }
      `}</style>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map((p) => (
          <div
            key={p.id}
            className="particle-rise"
            style={{
              left: p.left,
              width: `${p.size}px`,
              height: `${p.size}px`,
              '--duration': p.duration,
              '--delay': p.delay,
              '--drift-x': p.driftX,
              opacity: p.opacity,
            }}
          >
            {p.isLogo ? (
              <img
                src="/assets/justlogo.png"
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  background: 'rgba(255, 91, 31, 0.4)',
                  border: '1px solid rgba(255, 91, 31, 0.5)',
                }}
              />
            )}
          </div>
        ))}
      </div>
    </>
  );
};

const RocketButton = ({ onClick, children }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);

  const handleClick = useCallback(() => {
    if (isLaunching) return;
    setIsLaunching(true);
    setTimeout(() => {
      onClick?.();
    }, 600);
  }, [isLaunching, onClick]);

  return (
    <button
      data-testid="start-testing-btn"
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        group relative inline-flex items-center justify-center gap-3 
        h-14 px-8 py-3 text-base font-semibold rounded-md
        bg-primary text-white 
        shadow-lg  btn-glow
        transition-all duration-300 overflow-hidden
      `}
      disabled={isLaunching}
    >
      <div 
        className={`
          absolute inset-0
          transition-opacity duration-300
          ${isHovered && !isLaunching ? 'opacity-100' : 'opacity-0'}
        `}
      />
      
      <div className="relative z-10 flex items-center gap-2">
        <div 
          className={`
            absolute -bottom-3 left-1/2 -translate-x-1/2
            transition-all duration-200
            ${isHovered && !isLaunching ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}
          `}
        >
          <div className={`flex flex-col items-center ${isHovered ? 'flame-active' : ''}`}>
            <div className="w-2 h-4" />
            <div className="w-3 h-2 " />
          </div>
        </div>
        
        <Rocket 
          className={`
            w-5 h-5 transition-all duration-300
            ${isHovered && !isLaunching ? 'rocket-icon-hover' : ''}
            ${isLaunching ? 'rocket-icon-launch' : ''}
          `}
          style={{
            transform: isLaunching ? 'rotate(-45deg)' : 'rotate(0deg)',
          }}
        />
      </div>
      
      <span 
        className={`
          relative z-10 transition-opacity duration-300
          ${isLaunching ? 'opacity-0' : 'opacity-100'}
        `}
      >
        {children}
      </span>
      
      {isLaunching && (
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 rounded-full animate-ping"
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
};

const FeatureCard = ({ icon: Icon, title, desc }) => {
  return (
    <div 
      data-testid={`feature-card-${title.toLowerCase()}`}
      className="
        group relative p-6 rounded-2xl h-full overflow-hidden
        transition-all duration-500 cursor-default
        landing-card-bg backdrop-blur-sm glass-card
        border landing-border
        hover:border-[#ff5b1f]/40 hover:shadow-xl hover:shadow-[#ff5b1f]/5
      "
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[#ff5b1f]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="absolute -top-12 -right-12 w-24 h-24 bg-[#ff5b1f]/10 rounded-full blur-2xl group-hover:bg-[#ff5b1f]/20 transition-all duration-700" />
      
      <div className="relative z-10">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#ff5b1f]/30 to-[#ff5b1f]/10 flex items-center justify-center mb-4 text-[#ff5b1f] group-hover:scale-110 transition-transform duration-300">
          <Icon className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-semibold mb-2 landing-text-primary group-hover:text-[#ff5b1f] transition-colors duration-300">
          {title}
        </h3>
        <p className="text-sm landing-text-secondary leading-relaxed">
          {desc}
        </p>
      </div>
    </div>
  );
};

export default function Home({ workspaces = [], loading = false }) {
  const navigate = useNavigate();
  const [visibleCount, setVisibleCount] = useState(4);
  const [revealedCards, setRevealedCards] = useState(new Set());
  const cardsRef = useRef({});

  const loadMore = useCallback(() => {
    setVisibleCount(prev => Math.min(prev + 4, workspaces.length));
  }, [workspaces.length]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute('data-card-id');
            if (id && !revealedCards.has(id)) {
              setRevealedCards(prev => new Set(prev).add(id));
            }
          }
        });
      },
      { threshold: 0.1, rootMargin: '50px' }
    );

    Object.values(cardsRef.current).forEach(card => {
      if (card) observer.observe(card);
    });

    return () => observer.disconnect();
  }, [visibleCount, workspaces.length, revealedCards]);

  const visibleWorkspaces = workspaces.slice(0, visibleCount);
  const hasMore = visibleCount < workspaces.length;

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const getMembersText = (ws) => {
    if (ws.membersCount !== undefined) {
      return `${ws.membersCount} member${ws.membersCount !== 1 ? 's' : ''}`;
    }
    return '—';
  };

  return (
    <div 
      data-testid="home-page"
      className="flex-1 min-h-0 overflow-y-auto flex flex-col relative landing-bg"
    >
      {/* UNIFIED BACKGROUND SYSTEM */}
      {/* <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-[#ff5b1f]/20 rounded-full blur-3xl animate-pulse-glow" />
        <div 
          className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-[#ff5b1f]/20 rounded-full blur-3xl animate-pulse-glow"
          style={{ animationDelay: '2s' }}
        />
        <ParticleBackground />
      </div> */}

      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 " />
        <div 
          className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2"
          style={{ animationDelay: '2s' }}
        />
        <ParticleBackground />
      </div>

      {/* HERO SECTION */}
      <div 
        data-testid="hero-section"
        className="relative z-10 shrink-0 overflow-hidden border-b landing-border"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 relative">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#ff5b1f]/10 backdrop-blur-sm text-[#ff5b1f] rounded-full text-sm font-medium mb-6 border border-[#ff5b1f]/20 shadow-lg shadow-[#ff5b1f]/5 animate-fade-in-up">
              <Zap className="w-4 h-4" />
              Production-Grade API Testing
            </div>
            
            <h1 
              data-testid="hero-title"
              className="text-5xl md:text-5xl font-bold mb-4 animate-fade-in-up animation-delay-100 gradient-text"
            >
              API Testing & Verification Hub
            </h1>
            
            <p className="text-xl landing-text-secondary mb-8 max-w-2xl mx-auto animate-fade-in-up animation-delay-200">
              Automate your API workflows, verify responses, and collaborate with your team with confidence.
            </p>
            
            <div className="animate-fade-in-up animation-delay-300 transition-all duration-300 
hover:[text-shadow:1px_1px_0_#000,2px_2px_0_#000,3px_3px_0_#000]">
              <RocketButton onClick={() => navigate('/workspace')}>
                Start Testing
              </RocketButton>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pb-20 shrink-0">
        <h2 
          data-testid="features-section-title"
          className="text-3xl font-bold mb-8 landing-text-primary flex items-center gap-2"
        >
          <Sparkles className="w-6 h-6 text-[#ff5b1f]" />
          Key Features
        </h2>
        
        <div data-testid="features-grid" className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <FeatureCard
            icon={Activity}
            title="Discovery"
            desc="Discover and understand all existing API assets, configurations, and dependencies with intelligent scanning."
          />
          <FeatureCard
            icon={Shield}
            title="Policy & Security"
            desc="Analyze security protocols, enforce policies, and ensure compliance across your API landscape."
          />
          <FeatureCard
            icon={Target}
            title="Execution"
            desc="Move your APIs from one logic to another with full migration capabilities and low-risk pilots."
          />
        </div>

        {/* RECENT PROJECTS SECTION */}
        <div className="mt-16">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 data-testid="projects-section-title" className="text-2xl font-semibold landing-text-primary">
                Recent Projects
              </h3>
              <p className="text-sm landing-text-secondary mt-1">
                Your latest projects and their status
              </p>
            </div>
            
            {workspaces.length > 0 && (
              <button
                data-testid="view-all-projects-btn"
                onClick={() => navigate('/workspace/projects-management')}
                className="text-sm text-[#ff5b1f] hover:text-[#ff8c4a] flex items-center gap-1 transition-colors"
              >
                View all
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>

          {loading && (
            <div data-testid="projects-loading" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="p-6 rounded-2xl animate-pulse landing-card-bg backdrop-blur-sm border landing-border">
                  <div className="w-12 h-12 rounded-xl bg-dark-700 mb-4" />
                  <div className="h-4 bg-dark-700 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-dark-700 rounded w-1/2 mb-3" />
                  <div className="h-3 bg-dark-700 rounded w-2/3" />
                </div>
              ))}
            </div>
          )}

          {!loading && (
            <>
              <div data-testid="projects-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {visibleWorkspaces.map((ws, idx) => {
                  const cardId = ws.id;
                  const isRevealed = revealedCards.has(cardId);
                  
                  return (
                    <div
                      key={ws.id}
                      ref={el => cardsRef.current[cardId] = el}
                      data-card-id={cardId}
                      data-testid={`project-card-${ws.id}`}
                      onClick={() => navigate(`/workspace/projects-management?mode=details&projectId=${ws.id}`)}
                      className={`
                        group relative p-6 rounded-2xl cursor-pointer overflow-hidden
                        transition-all duration-500
                        landing-card-bg backdrop-blur-sm glass-card
                        border landing-border
                        hover:border-[#ff5b1f]/40 hover:shadow-xl hover:shadow-[#ff5b1f]/5
                        ${isRevealed ? 'animate-fade-in-up' : 'opacity-0 translate-y-8'}
                      `}
                      style={{ animationDelay: `${idx * 0.05}s` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-[#ff5b1f]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <div className="absolute -top-12 -right-12 w-24 h-24 bg-[#ff5b1f]/10 rounded-full blur-2xl group-hover:bg-[#ff5b1f]/20 transition-all duration-700" />
                      
                      <div className="relative z-10">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#ff5b1f]/30 to-[#ff5b1f]/10 flex items-center justify-center mb-4 text-[#ff5b1f] group-hover:scale-110 transition-transform duration-300">
                          <Activity className="w-6 h-6" />
                        </div>
                        <h4 className="text-base font-semibold mb-1 truncate landing-text-primary" title={ws.name}>
                          {ws.name}
                        </h4>
                        {ws.description && (
                          <p className="text-xs truncate mb-2 landing-text-secondary" title={ws.description}>
                            {ws.description}
                          </p>
                        )}
                        <div className="flex items-center justify-between text-xs mt-3 pt-2 border-t landing-border landing-text-secondary">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>{formatDate(ws.createdAt)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            <span>{getMembersText(ws)}</span>
                          </div>
                        </div>
                        <div className="mt-2">
                          <span className="inline-block text-xs capitalize px-2 py-0.5 rounded-full bg-dark-700/50 landing-text-secondary">
                            {ws.visibility || 'private'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {hasMore && (
                <div className="flex justify-center mt-8">
                  <button
                    data-testid="load-more-btn"
                    onClick={loadMore}
                    className="group flex items-center gap-2 px-5 py-2.5 rounded-xl landing-card-bg backdrop-blur-sm border landing-border landing-text-secondary hover:border-[#ff5b1f]/40 transition-all duration-300"
                  >
                    <span>Load More</span>
                    <ChevronDown className="w-4 h-4 transition-transform group-hover:translate-y-0.5" />
                  </button>
                </div>
              )}

              {workspaces.length === 0 && (
                <div 
                  data-testid="empty-projects-state"
                  className="flex flex-col items-center justify-center py-20 border border-dashed rounded-2xl text-center landing-border landing-card-bg backdrop-blur-sm"
                >
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 bg-[#ff5b1f]/10">
                    <Box className="w-8 h-8 text-[#ff5b1f]" />
                  </div>
                  <p className="text-sm font-medium landing-text-secondary mb-1">No projects yet</p>
                  <p className="text-xs landing-text-secondary opacity-70">
                    Head to the project management page to create your first one.
                  </p>
                  <button
                    data-testid="create-project-btn"
                    onClick={() => navigate('/workspace/projects-management?mode=create')}
                    className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-xl bg-[#ff5b1f]/10 text-[#ff5b1f] border border-[#ff5b1f]/20 hover:bg-[#ff5b1f]/20 transition-all duration-300"
                  >
                    <Rocket className="w-4 h-4" />
                    Open Project
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* FOOTER */}
      <footer 
        data-testid="footer"
        className="relative z-10 mt-12 shrink-0 border-t landing-border landing-card-bg backdrop-blur-sm"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col items-center justify-between gap-4 text-sm md:flex-row landing-text-secondary">
            <div className="flex items-center gap-2">
              <img src="/assets/justlogo.png" alt="ProbeStack logo" className="h-6 w-auto" />
              <span className="font-semibold gradient-text-primary font-heading">ProbeStack</span>
              <span>© {new Date().getFullYear()} All rights reserved</span>
            </div>
            <div className="flex items-center gap-6">
              <a href="/privacy-policy" className="hover:text-[#ff5b1f] transition-colors">Privacy Policy</a>
              <a href="/terms-of-service" className="hover:text-[#ff5b1f] transition-colors">Terms of Service</a>
              <a href="/security" className="hover:text-[#ff5b1f] transition-colors">Security</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}