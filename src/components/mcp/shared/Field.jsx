// src/components/mcp/shared/Field.jsx
import React from 'react';
import clsx from 'clsx';

/** Form field primitives matched to the ForgeQ theme. */

export function Field({ label, hint, error, required, children, className }) {
  return (
    <div className={clsx('space-y-1.5', className)}>
      {label && (
        <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          {label}{required && <span className="text-primary ml-1">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}
      {error && <p className="text-xs text-red-400 font-medium">{error}</p>}
    </div>
  );
}

export function TextInput({ className, ...rest }) {
  return (
    <input
      className={clsx(
        'w-full rounded-md  border border-dark-700 px-3 py-1.5 text-sm text-gray-200',
        'placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/50',
        className
      )}
      {...rest}
    />
  );
}

export function Select({ className, children, ...rest }) {
  return (
    <select
      className={clsx(
        'w-full rounded-md bg-dark-800 border border-dark-700 px-3 py-1.5 text-xs text-gray-200',
        'focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/50',
        className
      )}
      {...rest}
    >
      {children}
    </select>
  );
}

export function Button({ variant = 'primary', size = 'md', icon: Icon, loading, children, className, ...rest }) {
  const base = 'inline-flex items-center justify-center gap-1.5 font-medium rounded-md transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed';
  const variants = {
    primary: 'bg-primary hover:bg-primary/90 text-white shadow-[0_0_20px_-6px_rgba(255,91,31,0.6)]',
    ghost:   'text-gray-300 hover:text-white hover:bg-dark-700/60',
    outline: 'border border-dark-600 text-gray-200 hover:bg-dark-700/60 hover:border-primary/40',
    subtle:  'bg-dark-800/80 border border-dark-700 text-gray-300 hover:text-white hover:border-primary/40',
    danger:  'bg-red-500/15 border border-red-500/40 text-red-300 hover:bg-red-500/25',
    success: 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25',
  };
  const sizes = {
    sm: 'px-2.5 py-1 text-[11px]',
    md: 'px-3 py-1.5 text-xs',
    lg: 'px-4 py-2 text-sm',
  };
  return (
    <button className={clsx(base, variants[variant], sizes[size], className)} disabled={loading || rest.disabled} {...rest}>
      {loading ? (
        <span className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
      ) : Icon ? <Icon className={size === 'lg' ? 'w-4 h-4' : 'w-3.5 h-3.5'} /> : null}
      {children}
    </button>
  );
}
