// src/components/mcp/shared/StatusBadge.jsx
import React from 'react';
import clsx from 'clsx';

const PRESETS = {
  healthy:       { dot: 'bg-emerald-400', text: 'text-emerald-300', ring: 'ring-emerald-400/30', bg: 'bg-emerald-400/10', label: 'Healthy' },
  unhealthy:     { dot: 'bg-red-400',     text: 'text-red-300',     ring: 'ring-red-400/30',     bg: 'bg-red-400/10',     label: 'Unhealthy' },
  degraded:      { dot: 'bg-amber-400',   text: 'text-amber-300',   ring: 'ring-amber-400/30',   bg: 'bg-amber-400/10',   label: 'Degraded' },
  unknown:       { dot: 'bg-gray-400',    text: 'text-gray-300',    ring: 'ring-gray-400/30',    bg: 'bg-gray-400/10',    label: 'Unknown' },
  connecting:    { dot: 'bg-sky-400',     text: 'text-sky-300',     ring: 'ring-sky-400/30',     bg: 'bg-sky-400/10',     label: 'Connecting' },
  open:          { dot: 'bg-red-400',     text: 'text-red-300',     ring: 'ring-red-400/30',     bg: 'bg-red-400/10',     label: 'Breaker Open' },
  closed:        { dot: 'bg-emerald-400', text: 'text-emerald-300', ring: 'ring-emerald-400/30', bg: 'bg-emerald-400/10', label: 'Breaker Closed' },
  halfOpen:      { dot: 'bg-amber-400',   text: 'text-amber-300',   ring: 'ring-amber-400/30',   bg: 'bg-amber-400/10',   label: 'Half-Open' },
};

export default function StatusBadge({ status = 'unknown', label, pulse = false, size = 'sm', className }) {
  const p = PRESETS[status] || PRESETS.unknown;
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full ring-1 font-medium',
        p.bg, p.text, p.ring,
        size === 'xs' ? 'px-1.5 py-0.5 text-[12px]' : 'px-2 py-0.5 text-xs',
        className
      )}
    >
      <span className={clsx('relative w-1.5 h-1.5 rounded-full', p.dot)}>
        {pulse && <span className={clsx('absolute inset-0 rounded-full animate-ping opacity-60', p.dot)} />}
      </span>
      {label || p.label}
    </span>
  );
}
