// src/components/mcp/shared/Spinner.jsx
import React from 'react';
import clsx from 'clsx';

export default function Spinner({ size = 'md', className }) {
  const s = { sm: 'w-3.5 h-3.5 border-2', md: 'w-5 h-5 border-2', lg: 'w-7 h-7 border-[3px]' }[size] || 'w-5 h-5 border-2';
  return <span className={clsx('inline-block rounded-full border-primary border-t-transparent animate-spin', s, className)} />;
}

export function LoadingBlock({ label = 'Loading…', className }) {
  return (
    <div className={clsx('flex flex-col items-center justify-center py-10 text-gray-400', className)}>
      <Spinner size="lg" />
      <span className="mt-3 text-xs">{label}</span>
    </div>
  );
}
