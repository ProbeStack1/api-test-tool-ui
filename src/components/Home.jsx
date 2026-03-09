import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Activity, Shield, Target, Box, Rocket } from 'lucide-react';

export default function Home({ workspaces = [] }) {
  const navigate = useNavigate();
  return (
    <div className="flex-1 min-h-0 overflow-y-auto flex flex-col bg-probestack-bg">
      {/* Hero Section - same layout as Migration page */}
      <div className="border-b border-dark-700/50 bg-gradient-to-br from-probestack-bg via-dark-800/30 to-probestack-bg shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium mb-6 border border-primary/20">
              <Zap className="w-4 h-4" />
              Production-Grade API Testing
            </div>
            <h1 className="text-5xl font-bold mb-4 gradient-text">
              API Testing & Verification Hub
            </h1>
            <p className="text-xl text-gray-400 mb-8">
              Automate your API workflows, verify responses, and collaborate with your team with confidence.
            </p>
            <button
              onClick={() => navigate('/workspace')}
              className="inline-flex items-center justify-center gap-2 h-12 px-8 py-3 text-base font-semibold rounded-lg bg-[#ff5b1f] text-white shadow-[0_12px_25px_-12px_rgba(255,91,31,0.65)] hover:bg-[#ff5b1f]/90 hover:shadow-[0_12px_35px_-10px_rgba(255,91,31,0.8)] transition-all duration-300"
            >
              <Rocket className="w-5 h-5" />
              Start Testing
            </button>
          </div>
        </div>
      </div>

      {/* Content - same max-width and padding as Migration */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-16 shrink-0">
        {/* Key Features - same section title style as Migration */}
        <h2 className="text-2xl font-bold mb-6 text-white">
          Key Features
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FeatureCard
            icon={Activity}
            title="Discovery"
            desc="Discovery is the goal to discover and understand all existing API assets, configurations, and dependencies."
          />
          <FeatureCard
            icon={Shield}
            title="Policy & Security"
            desc="Policy & Feature Compatibility ensures detailed analysis and evaluation of security protocols."
          />
          <FeatureCard
            icon={Target}
            title="Execution"
            desc="Move your APIs from one logic to another with full migration capabilities and low-risk pilots."
          />
        </div>

        {/* Recent Workspaces - populated from backend when authenticated */}
        <div className="mt-12">
          <h3 className="text-xl font-semibold mb-2 text-white">
            Recent Workspaces
          </h3>
          <p className="text-sm text-gray-400 mb-6">
            Your latest workspaces and their status
          </p>

          {workspaces.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 border border-dashed border-dark-700 rounded-lg text-center">
              <Box className="w-12 h-12 text-dark-700 mb-4" />
              <p className="text-sm font-medium text-gray-400 mb-1">No workspaces yet</p>
              <p className="text-xs text-gray-600">
                Head to the workspace to create your first one.
              </p>
              <button
                onClick={() => navigate('/workspace')}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
              >
                <Rocket className="w-4 h-4" />
                Open Workspace
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {workspaces.map((ws) => (
                <div
                  key={ws.id}
                  onClick={() => navigate('/workspace')}
                  className="p-6 border border-dark-700 rounded-lg hover:border-primary/30 transition-all duration-300 cursor-pointer relative overflow-hidden group"
                >
                  <div className="absolute top-0 right-0 p-2 opacity-50">
                    <Box className="w-24 h-24 text-dark-700/50 -mr-8 -mt-8" />
                  </div>
                  <div className="relative z-10">
                    <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center mb-4 text-primary">
                      <Activity className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-semibold text-white mb-1 truncate" title={ws.name}>
                      {ws.name}
                    </h4>
                    {ws.description && (
                      <p className="text-xs text-gray-500 truncate mb-1" title={ws.description}>
                        {ws.description}
                      </p>
                    )}
                    <span className="inline-block text-xs text-gray-600 capitalize">
                      {ws.visibility || 'private'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer - same as Migration page (porbestack-new-repo), visible strip */}
      <footer className="border-t border-dark-700/50 mt-12 shrink-0 bg-dark-800/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col items-center justify-between gap-4 text-sm text-gray-400 md:flex-row">
            <div className="flex items-center gap-2">
              <img
                src="/assets/justlogo.png"
                alt="ProbeStack logo"
                className="h-6 w-auto"
                onError={(e) => { e.target.onerror = null; e.target.src = '/logo.png'; }}
              />
              <span className="font-semibold gradient-text font-heading">ProbeStack</span>
              <span className="text-gray-400">
                © {new Date().getFullYear()} All rights reserved
              </span>
            </div>
            <div className="flex items-center gap-6">
              <a
                href="/privacy-policy"
                className="hover:text-[#ff5b1f] transition-colors text-gray-400"
              >
                Privacy Policy
              </a>
              <a
                href="/terms-of-service"
                className="hover:text-[#ff5b1f] transition-colors text-gray-400"
              >
                Terms of Service
              </a>
              <a
                href="/security"
                className="hover:text-[#ff5b1f] transition-colors text-gray-400"
              >
                Security
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, desc }) {
  return (
    <div className="p-6 border border-dark-700 rounded-lg hover:border-primary/30 transition-all duration-300 h-full">
      <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-primary" />
      </div>
      <h3 className="text-lg font-semibold mb-2 text-white">{title}</h3>
      <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>
    </div>
  );
}
