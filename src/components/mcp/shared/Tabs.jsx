// src/components/mcp/shared/Tabs.jsx
import React from 'react';
import clsx from 'clsx';

/**
 * Pill tab row with animated active indicator.
 * tabs = [{ id, label, icon?, count?, hint? }]
 */
export default function Tabs({ tabs, value, onChange, size = 'md', className }) {
  return (
    <div className={clsx('inline-flex items-center gap-1 p-1 rounded-lg bg-dark-900/60 border border-dark-700/60', className)}>
      {tabs.map(t => {
        const Icon = t.icon;
        const active = t.id === value;
        return (
          <button
            key={t.id}
            type="button"
            data-testid={`mcp-tab-${t.id}`}
            onClick={() => onChange(t.id)}
            title={t.hint || t.label}
            className={clsx(
              'group relative inline-flex items-center gap-1.5 rounded-md font-medium transition-all duration-200',
              size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-xs',
              active
                ? 'bg-primary/15 text-white ring-1 ring-primary/40 shadow-[0_0_18px_-6px_rgba(255,91,31,0.6)]'
                : 'text-gray-400 hover:text-white hover:bg-dark-700/60'
            )}
          >
            {Icon && <Icon className={clsx('w-3.5 h-3.5', active ? 'text-primary' : 'text-gray-500 group-hover:text-gray-300')} />}
            <span className="truncate">{t.label}</span>
            {typeof t.count === 'number' && (
              <span className={clsx('ml-1 px-1.5 rounded-full text-[11px] font-mono', active ? 'bg-primary/25 text-primary' : 'bg-dark-700 text-gray-400')}>
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
