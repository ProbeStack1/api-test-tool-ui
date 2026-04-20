// src/components/mcp/shared/Modal.jsx
import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import clsx from 'clsx';

export default function Modal({ isOpen, onClose, title, subtitle, children, footer, size = 'md' }) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const widthClass = {
    sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-2xl', '2xl': 'max-w-4xl',
  }[size] || 'max-w-md';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-10  backdrop-blur-sm animate-[fadeIn_160ms_ease-out]"
      onClick={onClose}
    >
      <div
        className={clsx('w-full bg-dark-800 border border-dark-600 rounded-2xl shadow-2xl overflow-hidden animate-[popIn_180ms_ease-out]', widthClass)}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-dark-700 bg-gradient-to-b from-dark-800 to-dark-800/60">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-white">{title}</h3>
            {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-dark-700 text-gray-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-4 max-h-[70vh] overflow-auto custom-scrollbar">{children}</div>
        {footer && <div className="px-5 py-3 border-t border-dark-700  flex items-center justify-end gap-2">{footer}</div>}
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes popIn { from { opacity: 0; transform: translateY(8px) scale(0.98) } to { opacity: 1; transform: translateY(0) scale(1) } }
      `}</style>
    </div>
  );
}

export function ModalButton({ variant = 'ghost', className, ...rest }) {
  const styles = {
    primary: 'bg-primary hover:bg-primary/90 text-white',
    danger:  'bg-red-500 hover:bg-red-600 text-white',
    ghost:   'text-gray-300 hover:bg-dark-700',
    outline: 'border border-dark-600 text-gray-200 hover:bg-dark-700',
  }[variant];
  return <button className={clsx('px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors', styles, className)} {...rest} />;
}
