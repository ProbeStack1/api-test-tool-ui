// src/components/mcp/shared/Card.jsx
import React from 'react';
import clsx from 'clsx';

/**
 * Glass-style surface matched to the ForgeQ / probestack theme.
 * Keeps radius, blur and 1px border consistent across every MCP screen.
 */
export default function Card({ as: Tag = 'div', className, hoverable = false, glow = false, children, ...rest }) {
  return (
    <Tag
      className={clsx(
        'relative rounded-xl border border-dark-700/60 bg-probestack-bg backdrop-blur-sm',
        hoverable && 'transition-all duration-200 hover:border-primary/40 hover:bg-dark-800/80',
        glow && 'shadow-[0_0_0_1px_rgba(255,91,31,0.25),0_10px_40px_-20px_rgba(255,91,31,0.35)]',
        className
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export function CardHeader({ title, subtitle, icon: Icon, right, className }) {
  return (
    <div className={clsx('flex items-start justify-between gap-3 p-4 border-b border-dark-700/60', className)}>
      <div className="flex items-start gap-3 min-w-0">
        {Icon && (
          <div className="shrink-0 w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Icon className="w-4 h-4 text-primary" />
          </div>
        )}
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-white truncate">{title}</h3>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5 truncate">{subtitle}</p>}
        </div>
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}

export function CardBody({ className, children }) {
  return <div className={clsx('p-4', className)}>{children}</div>;
}
