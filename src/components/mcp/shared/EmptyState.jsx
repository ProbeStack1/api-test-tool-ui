// src/components/mcp/shared/EmptyState.jsx
import React from 'react';
import clsx from 'clsx';

export default function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div className={clsx('flex flex-col items-center justify-center text-center py-12 px-6', className)}>
      {Icon && (
        <div className="relative mb-4">
          <div className="absolute inset-0 blur-2xl bg-primary/20 rounded-full" />
          <div className="relative w-14 h-14 rounded-2xl border border-primary/30 bg-primary/5 flex items-center justify-center">
            <Icon className="w-6 h-6 text-primary" />
          </div>
        </div>
      )}
      {title && <h4 className="text-sm font-semibold text-gray-200">{title}</h4>}
      {description && <p className="text-xs text-gray-500 mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
