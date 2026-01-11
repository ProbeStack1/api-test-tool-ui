import React from 'react';
import { Send, Loader2 } from 'lucide-react';
import clsx from 'clsx';

export default function RequestPanel({
    url,
    method,
    onUrlChange,
    onMethodChange,
    onSend,
    isLoading
}) {
    const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

    const getMethodColor = (m) => {
        switch (m) {
            case 'GET': return 'text-green-500';
            case 'POST': return 'text-yellow-500';
            case 'PUT': return 'text-blue-500';
            case 'DELETE': return 'text-red-500';
            default: return 'text-purple-500';
        }
    };

    return (
        <div className="flex gap-2 relative group">
            <div className="relative">
                <select
                    value={method}
                    onChange={(e) => onMethodChange(e.target.value)}
                        className={clsx(
                            "h-9 bg-dark-900/80 border border-dark-700 rounded-lg px-4 font-bold text-xs focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 appearance-none pr-10 cursor-pointer tracking-wide transition-all hover:bg-dark-900 hover:border-dark-600 shadow-sm",
                            getMethodColor(method)
                        )}
                >
                    {methods.map(m => <option key={m} value={m} className="text-white bg-dark-800">{m}</option>)}
                </select>
                {/* Custom arrow for better aesthetics */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                    <svg width="10" height="6" viewBox="0 0 10 6" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>
            </div>

            <input
                type="text"
                value={url}
                onChange={(e) => onUrlChange(e.target.value)}
                placeholder="https://api.example.com/v1/users"
                className="flex-1 h-9 bg-dark-900/80 border border-dark-700 rounded-lg px-4 text-xs focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all font-mono placeholder:text-dark-500 text-gray-200 hover:border-dark-600 shadow-sm"
            />

            <button
                onClick={onSend}
                disabled={isLoading}
                className="h-9 bg-[#ff5b1f] hover:bg-[#ff6d2f] text-white font-bold px-4 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-[0.98] shadow-lg shadow-[#ff5b1f]/20 text-xs"
            >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span className="hidden sm:inline">Send</span>
            </button>
        </div>
    )
}
