import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Folder, MoreHorizontal, FileCode } from 'lucide-react';
import clsx from 'clsx';

export default function CollectionsList() {
    const [expanded, setExpanded] = useState({});

    const toggle = (id) => {
        setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const collections = [
        {
            id: '1', name: 'API Echo', items: [
                {
                    id: '1-1', name: 'Request Methods', type: 'folder', items: [
                        { id: '1-1-1', name: 'GET Request', method: 'GET', type: 'request' },
                        { id: '1-1-2', name: 'POST Raw Body', method: 'POST', type: 'request' },
                    ]
                },
                { id: '1-2', name: 'Authentication', type: 'folder', items: [] }
            ]
        },
        {
            id: '2', name: 'My API V1', items: [
                {
                    id: '2-1', name: 'Users', type: 'folder', items: [
                        { id: '2-1-1', name: 'List Users', method: 'GET', type: 'request' },
                        { id: '2-1-2', name: 'Create User', method: 'POST', type: 'request' },
                    ]
                }
            ]
        }
    ];

    return (
        <div className="flex flex-col h-full">
            <div className="p-2">
                <button className="w-full py-1.5 text-xs font-semibold bg-dark-700/50 hover:bg-dark-700 border border-dark-600 rounded text-gray-300 transition-colors mb-2">
                    + Create Collection
                </button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar pb-4">
                {collections.map(col => (
                    <CollectionItem key={col.id} item={col} expanded={expanded} onToggle={toggle} level={0} />
                ))}
            </div>
        </div>
    );
}

function CollectionItem({ item, expanded, onToggle, level }) {
    const isExpanded = expanded[item.id];
    const hasChildren = item.items && item.items.length > 0;
    const isRequest = item.type === 'request';

    return (
        <div>
            <div
                className={clsx(
                    "flex items-center gap-1 py-1 px-2 cursor-pointer hover:bg-dark-700/50 group select-none",
                    level > 0 && "ml-3 border-l border-dark-700"
                )}
                onClick={() => !isRequest && onToggle(item.id)}
            >
                <div className="w-4 h-4 flex items-center justify-center shrink-0">
                    {!isRequest && (
                        isExpanded ? <ChevronDown className="w-3 h-3 text-gray-500" /> : <ChevronRight className="w-3 h-3 text-gray-500" />
                    )}
                </div>

                {isRequest ? (
                    <span className={clsx("text-[9px] font-bold w-8 text-right shrink-0 mr-1",
                        item.method === 'GET' ? 'text-green-400' :
                            item.method === 'POST' ? 'text-yellow-400' :
                                item.method === 'DELETE' ? 'text-red-400' : 'text-blue-400'
                    )}>{item.method}</span>
                ) : (
                    <Folder className={clsx("w-3.5 h-3.5 shrink-0", level === 0 ? "fill-yellow-500/20 text-yellow-500" : "fill-gray-500/20 text-gray-500")} />
                )}

                <span className={clsx("text-xs truncate flex-1", isRequest ? "text-gray-300" : "font-medium text-gray-200")}>
                    {item.name}
                </span>

                <button className="opacity-0 group-hover:opacity-100 p-1 hover:text-white text-gray-500">
                    <MoreHorizontal className="w-3 h-3" />
                </button>
            </div>

            {hasChildren && isExpanded && (
                <div>
                    {item.items.map(child => (
                        <CollectionItem key={child.id} item={child} expanded={expanded} onToggle={onToggle} level={level + 1} />
                    ))}
                </div>
            )}
        </div>
    )
}
