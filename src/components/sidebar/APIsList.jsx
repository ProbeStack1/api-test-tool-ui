import React from 'react';
import { Box, FileText, GitBranch, Folder } from 'lucide-react';

export default function APIsList() {
    return (
        <div className="flex flex-col h-full">
            <div className="p-2">
                <button className="w-full py-1.5 text-xs font-semibold bg-dark-700/50 hover:bg-dark-700 border border-dark-600 rounded text-gray-300 transition-colors mb-4">
                    + Create API
                </button>
            </div>

            <div className="flex-1 overflow-y-auto px-2 space-y-3">
                {['User Management API', 'Payment Gateway'].map((api, i) => (
                    <div key={i} className="group">
                        <div className="px-2 py-1 flex items-center gap-2 cursor-pointer hover:bg-dark-700 rounded">
                            <Box className="w-3.5 h-3.5 text-blue-400" />
                            <span className="text-xs font-semibold text-gray-200 flex-1">{api}</span>
                        </div>
                        <div className="pl-6 mt-1 space-y-0.5 border-l border-dark-700 ml-3">
                            <div className="px-2 py-1 flex items-center gap-2 text-gray-400 hover:text-gray-200 cursor-pointer hover:bg-dark-700 rounded">
                                <FileText className="w-3 h-3" />
                                <span className="text-[11px]">Definition</span>
                            </div>
                            <div className="px-2 py-1 flex items-center gap-2 text-gray-400 hover:text-gray-200 cursor-pointer hover:bg-dark-700 rounded">
                                <GitBranch className="w-3 h-3" />
                                <span className="text-[11px]">v1.0.2</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
