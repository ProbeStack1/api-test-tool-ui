import React from 'react';
import { Layers, Eye, Check } from 'lucide-react';

export default function EnvironmentList() {
    return (
        <div className="flex flex-col h-full">
            <div className="p-2">
                <button className="w-full py-1.5 text-xs font-semibold bg-dark-700/50 hover:bg-dark-700 border border-dark-600 rounded text-gray-300 transition-colors mb-4">
                    + Create Environment
                </button>
            </div>

            <div className="flex-1 overflow-y-auto px-2 space-y-1">
                <div className="px-2 py-1 flex items-center gap-2 group cursor-pointer rounded hover:bg-dark-700">
                    <div className="w-4 h-4 flex items-center justify-center">
                        <Check className="w-3 h-3 text-primary" />
                    </div>
                    <Layers className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-xs text-gray-200 flex-1">Globals</span>
                    <button className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-white">
                        <Eye className="w-3.5 h-3.5" />
                    </button>
                </div>

                <div className="text-[10px] font-semibold text-gray-500 px-3 mt-4 mb-2 uppercase tracking-wider">Active</div>

                {['Production', 'Development', 'Staging'].map((env, i) => (
                    <div key={i} className="px-2 py-1 flex items-center gap-2 group cursor-pointer rounded hover:bg-dark-700">
                        <div className="w-4 h-4 flex items-center justify-center"></div>
                        <div className="w-3.5 h-3.5 bg-gray-600 rounded-sm flex items-center justify-center text-[8px] font-bold text-dark-900 leading-none">E</div>
                        <span className="text-xs text-gray-200 flex-1">{env}</span>
                        <button className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-white">
                            <Eye className="w-3.5 h-3.5" />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
