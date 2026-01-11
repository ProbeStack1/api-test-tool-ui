import React from 'react';
import { Plus, Download, Layout, Activity, Shield, ArrowRight, Zap, Target, Box } from 'lucide-react';

export default function Home({ onNavigate }) {
    return (
        <div className="flex-1 overflow-auto bg-dark-900 flex flex-col items-center">
            {/* Hero Section */}
            <div className="w-full max-w-5xl px-8 pt-20 pb-12 flex flex-col items-center text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-6 animate-fade-in">
                    <Zap className="w-3 h-3" />
                    <span>Production-Grade API Testing</span>
                </div>

                <h1 className="text-5xl font-bold text-white mb-4 tracking-tight leading-tight">
                    API Gateway <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600">Testing & </span> <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600">Verification</span> Hub
                </h1>

                <p className="text-gray-400 text-lg mb-8 max-w-2xl">
                    Automate your API workflows, verify responses, and collaborate with your team with confidence.
                </p>

                <button
                    onClick={() => onNavigate('workspace')}
                    className="group px-8 py-3 bg-gradient-to-r from-[#ff5b1f] via-[#ffb400] to-[#1fbf9a] rounded-lg text-[#121018] font-bold text-sm shadow-lg hover:opacity-90 transition-opacity flex items-center gap-2"
                >
                    <Zap className="w-4 h-4 fill-[#121018]" />
                    Start Testing
                </button>
            </div>

            {/* Features Grid */}
            <div className="w-full max-w-6xl px-8 pb-20">
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
            </div>

            {/* Recent Workspaces */}
            <div className="w-full max-w-6xl px-8 pb-12">
                <h3 className="text-lg font-semibold text-white mb-6 pl-2 border-l-4 border-primary">Recent Workspaces</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="p-4 bg-dark-800 border border-dark-700 rounded-lg group hover:border-primary/50 transition-all cursor-pointer relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-2 opacity-50">
                                <Box className="w-24 h-24 text-dark-700/50 -mr-8 -mt-8" />
                            </div>
                            <div className="relative z-10">
                                <div className="w-8 h-8 rounded bg-dark-700 flex items-center justify-center text-primary mb-3">
                                    <Activity className="w-4 h-4" />
                                </div>
                                <h4 className="text-sm font-semibold text-gray-200 mb-1">My API Project {i}</h4>
                                <p className="text-xs text-gray-500">Updated 2h ago</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function FeatureCard({ icon: Icon, title, desc }) {
    return (
        <div className="p-8 bg-dark-800 border border-dark-700 rounded-xl hover:border-dark-600 transition-all shadow-xl shadow-black/20 group relative overflow-hidden">
            <div className="w-12 h-12 rounded-lg bg-dark-700/50 flex items-center justify-center mb-6 text-primary group-hover:scale-110 transition-transform duration-300">
                <Icon className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
            <p className="text-sm text-gray-400 leading-relaxed">
                {desc}
            </p>

            {/* Hover Gradient Effect */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
        </div>
    )
}
