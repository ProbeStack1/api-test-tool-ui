import React from 'react';

export default function CodeEditor({ value = '', onChange, placeholder, className = '' }) {
    const lineCount = value ? value.split('\n').length : 1;
    const lines = Math.max(lineCount, 20);

    return (
        <div className={`h-full relative font-mono text-xs ${className}`}>
            <div className="absolute left-0 top-0 bottom-0 w-8 bg-dark-800 border-r border-dark-700 flex flex-col items-end pt-4 pr-2 select-none text-gray-600">
                {Array.from({ length: lines }).map((_, i) => <div key={i} className="leading-6">{i + 1}</div>)}
            </div>
            <textarea
                value={value}
                onChange={(e) => onChange && onChange(e.target.value)}
                className="w-full h-full bg-dark-900/50 border border-dark-700/50 rounded-lg pl-10 pt-4 p-4 text-gray-300 resize-none focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 leading-6"
                placeholder={placeholder}
                spellCheck={false}
            />
        </div>
    );
}
