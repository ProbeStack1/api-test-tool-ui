import React from 'react';
import ReactDOM from 'react-dom';

/**
 * Enhanced Running Modal Component
 * Shows an attractive, modern loading animation during collection runs
 * 
 * @param {boolean} isOpen - Controls modal visibility
 * @param {string} title - Title text (default: "Running Collection")
 * @param {string} subtitle - Subtitle text 
 * @param {number} progress - Progress percentage (0-100)
 */
const RunModal = ({ isOpen, title = "Running Collection", subtitle = "Please wait...", progress = 0 }) => {
  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md">
      {/* Main Modal Container */}
      <div className="bg-gradient-to-b from-dark-800 to-dark-900 border border-dark-600/50 rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 relative overflow-hidden">
        
        {/* Animated Background Glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-primary/5 rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-primary/5 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center text-center">
          
          {/* Multi-Layer Animated Loader */}
          <div className="relative w-28 h-28 mb-8">
            {/* Outer rotating ring */}
            <div className="absolute inset-0 border-4 border-primary/10 rounded-full" />
            <div 
              className="absolute inset-0 border-4 border-transparent border-t-primary rounded-full animate-spin"
              style={{ animationDuration: '1.2s' }}
            />
            
            {/* Middle pulsing ring */}
            <div className="absolute inset-2 border-2 border-primary/20 rounded-full animate-pulse" />
            <div 
              className="absolute inset-2 border-2 border-transparent border-r-primary/60 rounded-full animate-spin"
              style={{ animationDuration: '2s', animationDirection: 'reverse' }}
            />
            
            {/* Inner glow core */}
            <div className="absolute inset-6 bg-primary/10 rounded-full animate-pulse" />
            <div 
              className="absolute inset-6 border-2 border-transparent border-b-primary rounded-full animate-spin"
              style={{ animationDuration: '0.8s' }}
            />
            
            {/* Center icon with breathing effect */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center animate-bounce" style={{ animationDuration: '2s' }}>
                <svg 
                  className="w-5 h-5 text-primary" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M13 10V3L4 14h7v7l9-11h-7z" 
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Title with gradient */}
          <h3 className="text-xl font-bold text-white mb-2 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            {title}
          </h3>
          
          {/* Subtitle */}
          <p className="text-gray-400 mb-6 text-sm">{subtitle}</p>

          {/* Animated Progress Bar */}
          <div className="w-full max-w-xs">
            <div className="h-2 bg-dark-700/80 rounded-full overflow-hidden shadow-inner">
              {/* Animated gradient progress fill */}
              <div 
                className="h-full rounded-full transition-all duration-500 ease-out relative overflow-hidden"
                style={{ 
                  width: progress > 0 ? `${progress}%` : '60%',
                  background: 'linear-gradient(90deg, #ff5b1f 0%, #ff8c1f 50%, #ff5b1f 100%)',
                  backgroundSize: '200% 100%',
                  animation: progress > 0 ? 'none' : 'shimmer 2s linear infinite'
                }}
              >
                {/* Shine effect */}
                <div 
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                  style={{ animation: 'shine 2s ease-in-out infinite' }}
                />
              </div>
            </div>
            
            {/* Progress percentage */}
            {progress > 0 && (
              <p className="text-xs text-primary mt-2 font-medium">{Math.round(progress)}% Complete</p>
            )}
          </div>

          {/* Animated Dots Loader */}
          <div className="flex items-center gap-2 mt-6">
            <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 bg-primary/70 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>

          {/* Status text with typing effect */}
          <p className="text-xs text-gray-500 mt-4 flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            Executing requests...
          </p>
        </div>
      </div>

      {/* CSS Keyframes injected via style tag */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        
        @keyframes shine {
          0% { transform: translateX(-100%); }
          50%, 100% { transform: translateX(100%); }
        }
        
        .delay-1000 {
          animation-delay: 1000ms;
        }
      `}</style>
    </div>,
    document.body
  );
};

export default RunModal;
