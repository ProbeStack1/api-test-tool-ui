// src/components/mcp/shared/JsonEditor.jsx
import React, { useMemo } from 'react';
import clsx from 'clsx';
import { Check, AlertCircle } from 'lucide-react';

/**
 * Lightweight JSON textarea with live validation pill.
 * Keeps zero extra deps — pure textarea with monospace typography.
 */
export default function JsonEditor({ value, onChange, placeholder = '{\n  \n}', rows = 10, label, hint, className }) {
  const validation = useMemo(() => {
    if (!value || !value.trim()) return { ok: true, empty: true };
    try { JSON.parse(value); return { ok: true }; }
    catch (e) { return { ok: false, msg: e.message }; }
  }, [value]);

  return (
    <div className={clsx('space-y-1.5', className)}>
      {(label || hint) && (
        <div className="flex items-center justify-between">
          <div>
            {label && <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">{label}</label>}
            {hint && <p className="text-xs text-gray-500 mt-0.5">{hint}</p>}
          </div>
          {!validation.empty && (
            <span className={clsx(
              'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium',
              validation.ok ? 'bg-emerald-400/10 text-emerald-300' : 'bg-red-400/10 text-red-300'
            )}>
              {validation.ok ? <Check className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
              {validation.ok ? 'Valid JSON' : 'Invalid'}
            </span>
          )}
        </div>
      )}
      <textarea
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        rows={rows}
        spellCheck={false}
        placeholder={placeholder}
        className={clsx(
          'w-full rounded-lg bg-probestack-bg border px-3 py-2 text-xs font-mono text-gray-200 leading-relaxed resize-y',
          'focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/50 custom-scrollbar',
          validation.ok ? 'border-dark-700' : 'border-red-500/40'
        )}
        style={{ tabSize: 2 }}
      />
      {!validation.ok && <p className="text-xs text-red-400 font-mono">{validation.msg}</p>}
    </div>
  );
}

export const prettify = (v) => {
  if (!v) return v;
  try { return JSON.stringify(JSON.parse(v), null, 2); } catch { return v; }
};
