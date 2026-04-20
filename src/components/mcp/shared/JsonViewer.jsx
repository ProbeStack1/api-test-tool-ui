// src/components/mcp/shared/JsonViewer.jsx
import React, { useState, useMemo } from 'react';
import clsx from 'clsx';
import { Copy, Check, Maximize2, Minimize2 } from 'lucide-react';

/**
 * Read-only, syntax-tinted JSON viewer.
 * Tokens are highlighted via a lightweight regex, no external lib.
 */
function highlight(text) {
  if (!text) return '';
  return text
    .replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))
    .replace(/("(?:\\.|[^"\\])*")(\s*:)?/g,
      (_, s, colon) =>
        colon
          ? `<span class="text-sky-300">${s}</span>${colon}`
          : `<span class="text-emerald-300">${s}</span>`)
    .replace(/\b(true|false|null)\b/g, '<span class="text-amber-300">$1</span>')
    .replace(/\b(-?\d+(?:\.\d+)?(?:e[+-]?\d+)?)\b/g, '<span class="text-violet-300">$1</span>');
}

export default function JsonViewer({ data, title, expandDefault = false, maxHeight = 360, className }) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(expandDefault);

  const text = useMemo(() => {
    if (data == null) return '';
    if (typeof data === 'string') {
      try { return JSON.stringify(JSON.parse(data), null, 2); } catch { return data; }
    }
    try { return JSON.stringify(data, null, 2); } catch { return String(data); }
  }, [data]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  };

  return (
    <div className={clsx('rounded-lg border border-dark-700/60 bg-probestack-bg overflow-hidden', className)}>
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-dark-700/60 bg-dark-800/70">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">{title || 'Response'}</span>
        <div className="flex items-center gap-1">
          <button onClick={() => setExpanded(e => !e)} className="p-1 rounded hover:bg-dark-700/60 text-gray-400 hover:text-white" title={expanded ? 'Collapse' : 'Expand'}>
            {/* {expanded ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />} */}
          </button>
          <button onClick={handleCopy} className="p-1 rounded hover:bg-dark-700/60 text-gray-400 hover:text-white" title="Copy">
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          </button>
        </div>
      </div>
      <pre
        className="px-3 py-2 text-xs font-mono text-gray-200 overflow-auto custom-scrollbar leading-relaxed whitespace-pre"
        style={{ maxHeight: expanded ? 'none' : maxHeight }}
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: highlight(text) || '<span class="text-gray-500">—</span>' }}
      />
    </div>
  );
}
