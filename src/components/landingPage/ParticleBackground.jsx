import { useMemo } from 'react';

const PARTICLE_CONFIG = {
  logos: { count: 10, minSize: 8, maxSize: 22 },
  bubbles: { count: 15, minSize: 3, maxSize: 9 },
};

export default function ParticleBackground() {
  const particles = useMemo(() => {
    const logos = Array.from({ length: PARTICLE_CONFIG.logos.count }, (_, i) => ({
      id: `l${i}`,
      isLogo: true,
      size: PARTICLE_CONFIG.logos.minSize + Math.random() * (PARTICLE_CONFIG.logos.maxSize - PARTICLE_CONFIG.logos.minSize),
      left: `${Math.random() * 100}%`,
      duration: `${14 + Math.random() * 20}s`,
      delay: `-${Math.random() * 25}s`,
      driftX: `${(Math.random() - 0.5) * 80}px`,
      opacity: 0.06 + Math.random() * 0.18,
    }));
    const bubbles = Array.from({ length: PARTICLE_CONFIG.bubbles.count }, (_, i) => ({
      id: `b${i}`,
      isLogo: false,
      size: PARTICLE_CONFIG.bubbles.minSize + Math.random() * (PARTICLE_CONFIG.bubbles.maxSize - PARTICLE_CONFIG.bubbles.minSize),
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
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                background: 'rgba(255, 91, 31, 0.35)',
                border: '1px solid rgba(255, 91, 31, 0.45)',
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}
