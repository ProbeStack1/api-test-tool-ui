import React from 'react';
import { Trash2, Plus } from 'lucide-react';

export default function VariablesEditor({ pairs, onChange, title }) {
    const handleChange = (index, field, value) => {
        const newPairs = [...pairs];
        newPairs[index][field] = value;

        // Add new row if editing the last one
        if (index === pairs.length - 1 && (newPairs[index].key || newPairs[index].value)) {
            newPairs.push({ key: '', value: '' });
        }

        onChange(newPairs);
    };

    const handleRemove = (index) => {
        if (pairs.length === 1) {
            onChange([{ key: '', value: '' }]);
            return;
        }
        const newPairs = pairs.filter((_, i) => i !== index);
        onChange(newPairs);
    };

    const handleAdd = () => {
        onChange([...pairs, { key: '', value: '' }]);
    };

    return (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Title Header */}
            {title && (
                <div className="px-4 py-3 border-b border-dark-700">
                    <h2 className="text-sm font-semibold text-white">{title}</h2>
                </div>
            )}
            
            {/* Editor Content */}
            <div className="flex-1 overflow-auto p-4">
                <div className="border border-dark-700 rounded-lg overflow-hidden">
                    {/* Header */}
                    <div className="flex bg-[#161B30] border-b border-dark-600 text-[10px] text-gray-300 font-semibold uppercase tracking-wide">
                        <div className="flex-1 px-3 py-2 border-r border-dark-600">Key</div>
                        <div className="flex-1 px-3 py-2">Value</div>
                        <div className="w-10"></div>
                    </div>
                    
                    {/* Add Button */}
                    <div className="px-3 py-2 border-b border-dark-700/50 bg-[#161B30]">
                        <button
                            onClick={handleAdd}
                            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-200 transition-colors px-2 py-1 rounded hover:bg-dark-700/50"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add</span>
                        </button>
                    </div>

                    {/* Rows */}
                    <div>
                        {pairs.map((pair, index) => (
                            <div key={index} className="flex border-b border-dark-700/30 last:border-0 group hover:bg-dark-800/20 transition-colors">
                                <div className="flex-1 border-r border-dark-700">
                                    <input
                                        type="text"
                                        placeholder="Key"
                                        value={pair.key}
                                        onChange={(e) => handleChange(index, 'key', e.target.value)}
                                        className="w-full bg-[#0f172a]/50 px-3 py-2 text-sm text-white focus:outline-none hover:border-orange-500 focus:border-orange-500 placeholder:text-gray-500 font-mono transition-colors border border-transparent"
                                    />
                                </div>
                                <div className="flex-1">
                                    <input
                                        type="text"
                                        placeholder="Value"
                                        value={pair.value}
                                        onChange={(e) => handleChange(index, 'value', e.target.value)}
                                        className="w-full bg-[#0f172a]/50 px-3 py-2 text-sm text-white focus:outline-none hover:border-orange-500 focus:border-orange-500 placeholder:text-gray-500 font-mono transition-colors border border-transparent"
                                    />
                                </div>
                                <div className="w-10 flex items-center justify-center">
                                    <button
                                        onClick={() => handleRemove(index)}
                                        className="text-gray-600 hover:text-red-400 transition-all p-1 rounded hover:bg-red-500/10"
                                        title="Delete"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                
                {/* Usage hint */}
                <p className="mt-3 text-xs text-gray-500">
                    Use <code className="bg-dark-800 px-1 py-0.5 rounded text-gray-300">{'{{variable}}'}</code> in requests to substitute these values
                </p>
            </div>
        </div>
    );
}
