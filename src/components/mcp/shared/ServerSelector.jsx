// src/components/mcp/shared/ServerSelector.jsx
import React, { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';
import { ChevronDown, Server, Check, Zap } from 'lucide-react';
import StatusBadge from './StatusBadge';

/**
 * Compact server picker used across Inspector / Collections / Mocks / Bridge / AI.
 * `servers` = list of MCP server records (id, name, serverUrl, transport, healthStatus)
 */
export default function ServerSelector({ servers = [], value, onChange, onManage, className, placeholder = 'Select MCP server' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const selected = servers.find(s => (s.id || s.serverId) === value);

  return (
    <div ref={ref} className={clsx('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={clsx(
          'w-full inline-flex items-center gap-2 rounded-lg border bg-probestack-bg px-3 py-2 text-xs text-left transition-colors',
          'hover:border-primary/40',
          selected ? 'border-primary/30' : 'border-dark-700'
        )}
      >
        <div className="w-7 h-7 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
          <Server className="w-3.5 h-3.5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          {selected ? (
            <>
              <div className="text-gray-100 font-medium truncate">{selected.name}</div>
              <div className="text-[12px] text-gray-500 font-mono truncate">{selected.serverUrl || selected.url || selected.transport}</div>
            </>
          ) : (
            <span className="text-gray-500">{placeholder}</span>
          )}
        </div>
        {selected?.healthStatus && <StatusBadge status={(selected.healthStatus || '').toLowerCase()} size="xs" />}
        <ChevronDown className={clsx('w-3.5 h-3.5 text-gray-500 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute z-30 left-0 right-0 mt-1 max-h-72 overflow-auto custom-scrollbar rounded-lg border border-dark-700 bg-dark-800/95 backdrop-blur-md shadow-xl">
          {servers.length === 0 ? (
            <div className="p-4 text-center text-xs text-gray-500">
              No servers saved yet.
              {onManage && (
                <button
                  onClick={() => { setOpen(false); onManage(); }}
                  className="block mx-auto mt-2 text-primary hover:underline text-xs"
                >
                  + Register your first server
                </button>
              )}
            </div>
          ) : (
            servers.map(s => {
              const id = s.id || s.serverId;
              const active = id === value;
              return (
                <button
                  key={id}
                  onClick={() => { onChange(id, s); setOpen(false); }}
                  className={clsx(
                    'w-full flex items-center gap-2 px-3 py-2 text-left text-xs transition-colors',
                    active ? 'bg-primary/10 text-white' : 'text-gray-300 hover:bg-dark-700/60 hover:text-white'
                  )}
                >
                  <Zap className={clsx('w-3.5 h-3.5 shrink-0', active ? 'text-primary' : 'text-gray-500')} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{s.name}</div>
                    <div className="text-[12px] text-gray-500 font-mono truncate">{s.serverUrl || s.url || s.transport}</div>
                  </div>
                  {s.healthStatus && <StatusBadge status={(s.healthStatus || '').toLowerCase()} size="xs" />}
                  {active && <Check className="w-3.5 h-3.5 text-primary ml-1" />}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
