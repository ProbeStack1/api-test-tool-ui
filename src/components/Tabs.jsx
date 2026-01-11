import React from 'react';
import clsx from 'clsx';

export default function Tabs({ tabs, activeTab, onTabChange }) {
    return (
        <div className="flex gap-1 border-b border-dark-700 bg-dark-800/80 px-4 py-3 overflow-x-auto">
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={clsx(
                        "px-4 py-2 text-xs font-semibold rounded-lg transition-all relative whitespace-nowrap",
                        activeTab === tab.id
                            ? "text-primary bg-primary/10 border border-primary/20"
                            : "text-gray-400 hover:text-gray-200 hover:bg-dark-900/50"
                    )}
                >
                    {tab.label}
                    {activeTab === tab.id && (
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-2 w-1 h-1 rounded-full bg-primary"></div>
                    )}
                </button>
            ))}
        </div>
    );
}
