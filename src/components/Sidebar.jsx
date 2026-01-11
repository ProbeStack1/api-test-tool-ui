import React, { useState } from 'react';
import {
    History, LayoutGrid, Layers, Hexagon,
    Monitor, Server, MoreHorizontal, Plus,
    Search, Folder, Trash2, ChevronRight, ChevronLeft
} from 'lucide-react';
import clsx from 'clsx';

import CollectionsList from './sidebar/CollectionsList';
import EnvironmentList from './sidebar/EnvironmentList';
import APIsList from './sidebar/APIsList';

export default function Sidebar({ history, onSelectHistory, onClearHistory }) {
    const [activeNav, setActiveNav] = useState('collections'); // Default to collections as customary
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    const navItems = [
        { id: 'collections', icon: LayoutGrid, label: 'Collections' },
        { id: 'apis', icon: Hexagon, label: 'APIs' },
        { id: 'env', icon: Layers, label: 'Environments' },
        { id: 'mock', icon: Server, label: 'Mock Servers' },
        { id: 'monitor', icon: Monitor, label: 'Monitors' },
        { id: 'history', icon: History, label: 'History' },
    ];

    return (
        <div className="flex h-full border-r border-dark-700 bg-dark-800/60 backdrop-blur-sm shrink-0 z-20">
            {/* Primary Navigation Rail */}
            <div className="w-16 flex flex-col items-center py-3 border-r border-dark-700 bg-dark-900/50 gap-2 shrink-0">
                {navItems.map(item => (
                    <button
                        key={item.id}
                        onClick={() => setActiveNav(item.id)}
                        className={clsx(
                            "flex flex-col items-center gap-1 group relative w-full px-2",
                            activeNav === item.id ? "text-white" : "text-gray-500 hover:text-gray-300"
                        )}
                        title={item.label}
                    >
                        <div className={clsx(
                            "p-2.5 rounded-xl transition-all w-full flex items-center justify-center",
                            activeNav === item.id 
                                ? "bg-primary/15 text-primary shadow-sm shadow-primary/20" 
                                : "group-hover:bg-dark-800/80"
                        )}>
                            <item.icon strokeWidth={activeNav === item.id ? 2 : 1.5} className="w-5 h-5" />
                        </div>
                        <span className="text-[9px] font-medium mt-0.5">{item.label}</span>
                    </button>
                ))}
                {/* Collapse/Expand Button on Rail */}
                <div className="mt-auto pt-2 border-t border-dark-700/50 w-full">
                    <button
                        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                        className={clsx(
                            "w-full flex flex-col items-center gap-1 p-2 text-gray-500 hover:text-gray-300 transition-colors",
                            !isSidebarCollapsed && "hover:bg-dark-800/80 rounded-lg"
                        )}
                        title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                    >
                        <div className="p-2 rounded-lg">
                            <ChevronRight className={clsx("w-4 h-4 transition-transform", !isSidebarCollapsed && "rotate-180")} />
                        </div>
                    </button>
                </div>
            </div>

            {/* Secondary Panel */}
            <div className={clsx(
                "flex flex-col min-w-0 bg-dark-800/50 transition-all duration-300 overflow-hidden",
                isSidebarCollapsed ? "w-0" : "w-64"
            )}>
                {/* Panel Header */}
                <div className="h-14 px-4 border-b border-dark-700/50 flex items-center justify-between shrink-0 bg-dark-800/80">
                    <h2 className="font-semibold text-gray-200 text-xs">
                        {navItems.find(i => i.id === activeNav)?.label}
                    </h2>
                    <div className="flex gap-1">
                        {activeNav === 'collections' && (
                            <button className="p-2 hover:bg-dark-700/50 rounded-lg text-gray-400 hover:text-white transition-colors">
                                <Plus className="w-4 h-4" />
                            </button>
                        )}
                        <button className="p-2 hover:bg-dark-700/50 rounded-lg text-gray-400 hover:text-white transition-colors">
                            <MoreHorizontal className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Filter/Search */}
                <div className="p-3 border-b border-dark-700/50 bg-dark-800/40">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Filter..."
                            className="w-full bg-dark-900/50 border border-dark-700/50 rounded-lg px-9 py-2 text-xs text-gray-300 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 placeholder:text-dark-500 transition-all"
                        />
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {activeNav === 'history' && (
                        <HistoryList
                            history={history}
                            onSelectHistory={onSelectHistory}
                            onClearHistory={onClearHistory}
                        />
                    )}
                    {activeNav === 'collections' && <CollectionsList />}
                    {activeNav === 'env' && <EnvironmentList />}
                    {activeNav === 'apis' && <APIsList />}
                    {(activeNav === 'mock' || activeNav === 'monitor') && (
                        <div className="flex flex-col items-center justify-center h-48 text-center px-6 opacity-30">
                            <Server className="w-8 h-8 mb-3" />
                            <p className="text-xs">Feature coming soon</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function HistoryList({ history, onSelectHistory, onClearHistory }) {
    if (history.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-40 text-center px-6">
                <div className="w-12 h-12 rounded-xl bg-dark-700/50 flex items-center justify-center mb-3">
                    <History className="w-6 h-6 text-dark-500" />
                </div>
                <p className="text-gray-500 text-xs text-balance">
                    Requests you send will appear here
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col">
            <div className="px-4 py-3 text-xs text-gray-500 font-semibold flex justify-between items-center group bg-dark-800/30">
                <span className="uppercase tracking-wide">Today</span>
                <button onClick={onClearHistory} title="Clear All" className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all text-xs px-2 py-1 rounded hover:bg-red-500/10">
                    Clear
                </button>
            </div>
            {history.map((item, index) => (
                <button
                    key={index}
                    onClick={() => onSelectHistory(item)}
                    className="px-4 py-3 text-left hover:bg-dark-700/50 flex flex-col gap-1.5 group transition-colors relative border-l-2 border-transparent hover:border-primary/50"
                >
                    <div className="flex items-center gap-2.5 w-full overflow-hidden">
                        <span className={`text-[10px] font-bold min-w-[3.5ch] px-1.5 py-0.5 rounded ${item.method === 'GET' ? 'text-green-400 bg-green-400/10' :
                            item.method === 'POST' ? 'text-yellow-400 bg-yellow-400/10' :
                                item.method === 'PUT' ? 'text-blue-400 bg-blue-400/10' :
                                    item.method === 'DELETE' ? 'text-red-400 bg-red-400/10' :
                                        'text-purple-400 bg-purple-400/10'
                            }`}>{item.method}</span>
                        <span className="text-xs truncate text-gray-300 font-medium font-mono">
                            {item.url}
                        </span>
                    </div>
                </button>
            ))}
        </div>
    )
}

function CollectionsPlaceholder() {
    return (
        <div className="px-2 py-4 space-y-2">
            {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-2 px-2 py-1.5 text-gray-400 hover:bg-dark-700 hover:text-gray-200 rounded cursor-pointer group">
                    <ChevronRight className="w-3.5 h-3.5" />
                    <Folder className="w-4 h-4 fill-yellow-500/20 text-yellow-500" />
                    <span className="text-xs font-medium">My Collection {i}</span>
                </div>
            ))}
        </div>
    )
}
