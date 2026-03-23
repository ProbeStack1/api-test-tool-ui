// src/components/VariableAwareInput.jsx
import React, { useRef, useEffect } from 'react';
import clsx from 'clsx';

export default function VariableAwareInput({
  value = '',
  onChange,
  placeholder = '',
  className = '',
  multiLine = false,
  activeVarsMap = {},
  globalVarsMap = {},
  ...props
}) {
  const ref = useRef(null);

  const getHighlightedHTML = (text) => {
    if (!text) return '';

    let html = '';
    let lastIndex = 0;
    const regex = /\{\{([^{}\s]+)\}\}/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
      const start = match.index;
      const varName = match[1].trim();

      // Text before variable
      if (start > lastIndex) {
        html += `<span class="text-gray-200">${escapeHtml(text.slice(lastIndex, start))}</span>`;
      }

      // Variable styling
      let colorClass = 'text-gray-500 bg-gray-800/30';
      let title = 'Variable not found in active environment';

      if (varName in activeVarsMap) {
        colorClass = 'text-blue-400 font-medium bg-blue-950/30';
        title = `Value: ${escapeHtml(activeVarsMap[varName])}`;
      } else if (varName in globalVarsMap) {
        colorClass = 'text-red-400 font-medium italic bg-red-950/30';
        title = 'Exists in another/global environment';
      }

      html += `<span class="variable-token px-0.5 rounded-sm ${colorClass}" title="${title}">{{${varName}}}</span>`;

      lastIndex = regex.lastIndex;
    }

    // Remaining text
    if (lastIndex < text.length) {
      html += `<span class="text-gray-200">${escapeHtml(text.slice(lastIndex))}</span>`;
    }

    return html;
  };

  // Prevent XSS – important!
  function escapeHtml(unsafe) {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  useEffect(() => {
    if (ref.current) {
      // Only update when not focused (prevents cursor jumping)
      if (document.activeElement !== ref.current) {
        ref.current.innerHTML = getHighlightedHTML(value || '');
      }
    }
  }, [value, activeVarsMap, globalVarsMap]);

  const handleInput = () => {
    if (ref.current) {
      const text = ref.current.innerText;
      onChange(text);
      // Optional: re-highlight immediately while typing
      ref.current.innerHTML = getHighlightedHTML(text);
      // Restore cursor position (simple version)
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(ref.current);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  };

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      onInput={handleInput}
      className={clsx(
        "min-h-[38px] px-3 py-2 border border-dark-600 rounded bg-dark-850 text-sm font-mono",
        "focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20",
        "caret-white whitespace-pre-wrap break-all overflow-hidden",
        className
      )}
      placeholder={placeholder}
      {...props}
    />
  );
}