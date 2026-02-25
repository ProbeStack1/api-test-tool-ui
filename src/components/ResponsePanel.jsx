import React from 'react';
import { Globe } from 'lucide-react';
import clsx from 'clsx';

export default function ResponsePanel({ response, isLoading, error }) {
    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center text-dark-500 bg-probestack-bg">
                <div className="flex flex-col items-center gap-4 animate-pulse">
                    <Globe className="w-12 h-12 opacity-20" />
                    <p className="text-xs font-medium opacity-50">Sending Request...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex-1 p-6 bg-probestack-bg overflow-auto">
                <div className="bg-red-500/5 border border-red-500/20 text-red-400 p-4 rounded-lg shadow-lg shadow-black/20">
                    <h3 className="font-bold mb-2 text-red-500 flex items-center gap-2">
                        Request Failed
                    </h3>
                    <pre className="text-xs font-mono whitespace-pre-wrap rounded bg-black/20 p-4 border border-white/5">
                        {error.message || JSON.stringify(error, null, 2)}
                    </pre>
                </div>
            </div>
        );
    }

    if (!response) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-dark-600 bg-probestack-bg select-none">
                <div className="w-64 h-64 rounded-full bg-primary/5 blur-3xl absolute pointer-events-none"></div>
                <Globe className="w-16 h-16 mb-4 opacity-20 relative z-10" />
                <p className="relative z-10 font-medium opacity-50">Enter a URL to get started</p>
            </div>
        );
    }

    const isSuccess = response.status >= 200 && response.status < 300;

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-probestack-bg z-10 relative">
            {/* Response Header Bar */}
            <div className="h-12 border-b border-dark-700 flex items-center px-6 gap-6 text-xs bg-dark-800/60 backdrop-blur-sm shrink-0">
                <div className="flex items-center">
                    <span className="text-gray-400 font-medium text-[10px] uppercase tracking-wide w-12 leading-none">Status</span>
                    <span className={clsx("font-bold px-2 py-0.5 rounded text-xs inline-flex items-center leading-none", isSuccess ? "text-green-400 bg-green-400/10 border border-green-400/20" : "text-red-400 bg-red-400/10 border border-red-400/20")}>
                        {response.status} {response.statusText}
                    </span>
                </div>
                <div className="flex items-center">
                    <span className="text-gray-400 font-medium text-[10px] uppercase tracking-wide w-12 leading-none">Time</span>
                    <span className="font-mono text-gray-200 font-semibold text-xs leading-none">{response.time}ms</span>
                </div>
                <div className="flex items-center">
                    <span className="text-gray-400 font-medium text-[10px] uppercase tracking-wide w-12 leading-none">Size</span>
                    <span className="font-mono text-gray-200 font-semibold text-xs leading-none">{response.size} B</span>
                </div>
            </div>

            {/* Response Body */}
            <div className="flex-1 overflow-auto custom-scrollbar relative bg-probestack-bg">
                <div className="p-6">
                    <div className="bg-dark-800/30 border border-dark-700/50 rounded-xl overflow-hidden">
                        <pre className="text-xs font-mono text-gray-300 leading-relaxed p-4 overflow-x-auto">
                            {JSON.stringify(response.data, null, 2)}
                        </pre>
                    </div>
                </div>
            </div>
        </div>
    );
}
