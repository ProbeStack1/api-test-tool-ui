/**
 * KeyValueEditor.jsx
 * 
 * Key-value pair editor with support for {{variable}} highlighting.
 * Variables are highlighted with colors based on their environment status:
 * - BLUE: Present in active environment (tooltip shows value)
 * - YELLOW: Present in inactive environment (tooltip shows activate message)
 * - RED: Not present in any environment (tooltip shows not found message)
 * 
 * Variable values are substituted in payload, but variable names are displayed in UI.
 */

import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import ReactDOM from "react-dom";
import { Trash2, Plus } from "lucide-react";
import clsx from "clsx";

/**
 * Parses text to find {{variable}} patterns
 * @param {string} text - Text to parse
 * @returns {Array} segments with type 'text' or 'variable'
 */
const parseVariables = (text) => {
  if (!text) return [{ type: 'text', content: '' }];
  const regex = /(\{\{[^}]+\}\})/g;
  const parts = text.split(regex);
  return parts.map((part) => {
    if (part.match(/^\{\{[^}]+\}\}$/)) {
      const varName = part.slice(2, -2);
      return { type: 'variable', content: part, varName };
    }
    return { type: 'text', content: part };
  }).filter(p => p.content !== '');
};

/**
 * Gets variable status and tooltip
 */
const getVariableStatus = (varName, activeEnvVars, inactiveEnvVars, globalVars, activeEnvValues, inactiveEnvInfo, globalValues) => {
  if (activeEnvVars && activeEnvVars.has(varName)) {
    return {
      status: 'active',
      color: 'text-blue-400',
      tooltip: `Value: ${activeEnvValues?.[varName] || '(empty)'}`
    };
  }
  if (inactiveEnvVars && inactiveEnvVars.has(varName)) {
    const info = inactiveEnvInfo?.[varName] || {};
    return {
      status: 'inactive',
      color: 'text-yellow-400',
      tooltip: `Present in "${info.envName || 'another environment'}" which is not active. Please activate first, then use.`
    };
  }
  if (globalVars && globalVars.has(varName)) {
    return {
      status: 'global',
      color: 'text-purple-400',
      tooltip: `Global variable: ${globalValues?.[varName] || '(empty)'}`
    };
  }
  return {
    status: 'missing',
    color: 'text-red-400',
    tooltip: 'No environment variable present with this name.'
  };
};

/**
 * Inline Variable Tooltip component - uses ReactDOM.createPortal
 * so it escapes the overlay's overflow-hidden clipping.
 */
function VariableTooltipInline({ tooltip, status, children }) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const ref = useRef(null);

  const handleMouseEnter = () => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setPos({
        top: rect.bottom + 6,
        left: rect.left + rect.width / 2,
      });
      setShow(true);
    }
  };

  return (
    <span
      ref={ref}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && ReactDOM.createPortal(
        <div
className={clsx(
  "fixed px-2.5 py-1.5 text-[10px] rounded-lg shadow-xl z-[200]",
  "whitespace-normal break-words max-w-[250px] pointer-events-none",
  "bg-dark-800 border",
  status === 'active' && "border-blue-400/30 text-blue-300",
  status === 'inactive' && "border-yellow-400/30 text-yellow-300",
  status === 'global' && "border-purple-400/30 text-purple-300",
  status === 'missing' && "border-red-400/30 text-red-300"
)}
          style={{
            top: pos.top,
            left: pos.left,
            transform: 'translate(-50%, 0)',
          }}
        >
          {tooltip}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-dark-800" />
        </div>,
        document.body
      )}
    </span>
  );
}

/**
 * Highlighted input cell that shows variable colors
 * Uses overlay technique to show colored variables while keeping input editable.
 * CRITICAL: No padding/border on variable spans - only color + background.
 * This ensures overlay text matches input text width exactly (no cursor offset).
 */
function HighlightedInput({ value, onChange, placeholder, activeEnvVars, inactiveEnvVars, activeEnvValues, inactiveEnvInfo, globalVars, globalValues }) {
  const inputRef = useRef(null);
  const overlayRef = useRef(null);

  const segments = useMemo(() => parseVariables(value), [value]);
  const hasVars = segments.some(s => s.type === 'variable');

  // Sync scroll
  const handleScroll = useCallback(() => {
    if (overlayRef.current && inputRef.current) {
      overlayRef.current.scrollLeft = inputRef.current.scrollLeft;
    }
  }, []);

const colorClass = {
    active: 'text-blue-400',
    inactive: 'text-yellow-400',
    global: 'text-purple-400',
    missing: 'text-red-400'
  };

  const bgColor = {
    active: 'rgba(96,165,250,0.18)',
    inactive: 'rgba(250,204,21,0.18)',
    global: 'rgba(168,85,247,0.18)',
    missing: 'rgba(248,113,113,0.18)'
  };

  return (
    <div className="relative w-full">
      {/* Real input - below for typing */}
      <input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={handleScroll}
        className={clsx(
          "w-full bg-transparent px-3 py-1.5 text-xs focus:outline-none focus:bg-dark-900/30 placeholder:text-dark-500 font-mono transition-colors relative z-0",
          hasVars ? "text-transparent caret-gray-200" : "text-gray-200"
        )}
      />
      {/* Overlay with colored variables - on top for hover tooltips */}
      {hasVars && (
        <div
          ref={overlayRef}
          className="absolute inset-0 flex items-center px-3 py-1.5 font-mono text-xs whitespace-pre overflow-hidden pointer-events-none z-10"
        >
          {segments.map((seg, i) => {
            if (seg.type === 'variable') {
               const { status, tooltip, color } = getVariableStatus(
    seg.varName,
    activeEnvVars,
    inactiveEnvVars,
    globalVars,
    activeEnvValues,
    inactiveEnvInfo,
    globalValues
  );
              return (
                <span key={i} className="pointer-events-auto">
                  <VariableTooltipInline tooltip={tooltip} status={status}>
                    <span
                      className={clsx("cursor-help pointer-events-auto", colorClass[status])}
                      style={{ backgroundColor: bgColor[status], borderRadius: '2px' }}
                    >
                      {`{{${seg.varName}}}`}
                    </span>
                  </VariableTooltipInline>
                </span>
              );
            }
            return <span key={i} className="text-gray-200">{seg.content}</span>;
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Main KeyValueEditor Component
 * Enhanced with variable highlighting support
 * 
 * @param {Array} pairs - Array of { key, value } objects
 * @param {function} onChange - Callback when pairs change
 * @param {Set} activeEnvVars - Variables in active environment (optional)
 * @param {Set} inactiveEnvVars - Variables in inactive environments (optional)
 * @param {Object} activeEnvValues - Values map for active env (optional)
 * @param {Object} inactiveEnvInfo - Info map for inactive envs (optional)
 */
export default function KeyValueEditor({
  pairs,
  onChange,
  activeEnvVars = new Set(),
  inactiveEnvVars = new Set(),
  activeEnvValues = {},
  inactiveEnvInfo = {},
  globalVars = new Set(),
  globalValues = {},
}) {
  const handleChange = (index, field, value) => {
    const newPairs = [...pairs];
    newPairs[index][field] = value;
    onChange(newPairs);
  };

  const handleRemove = (index) => {
    if (pairs.length === 1) {
      onChange([{ key: "", value: "" }]);
      return;
    }
    const newPairs = pairs.filter((_, i) => i !== index);
    onChange(newPairs);
  };

  const handleAdd = () => {
    onChange([...pairs, { key: "", value: "" }]);
  };

  // Check if variable highlighting is enabled (env data provided)
const hasEnvData = activeEnvVars.size > 0 || inactiveEnvVars.size > 0 || globalVars.size > 0;

  return (
    <div className="border border-dark-700 rounded overflow-hidden " data-testid="key-value-editor">
      {/* Header */}
      <div className="flex bg-[var(--color-card-bg)] border-b border-dark-700 text-[10px] text-gray-400 font-semibold uppercase tracking-wide">
        <div className="flex-1 px-3 py-1.5 border-r border-dark-700">Key</div>
        <div className="flex-1 px-3 py-1.5 border-r border-dark-700">Value</div>
        <div className="w-10"></div>
      </div>

      {/* Add Button */}
      <div className="px-3 py-2 border-b border-dark-700/50 bg-[var(--color-input-bg)]">
        <button
          onClick={handleAdd}
          className="flex items-center cursor-pointer gap-1.5 text-xs text-gray-400 hover:text-gray-200 transition-colors px-2 py-1 rounded hover:bg-dark-700/50"
          data-testid="kv-add-btn"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add</span>
        </button>
      </div>

      {/* Rows */}
      <div className="bg-[var(--color-input-bg)]">
        {pairs.map((pair, index) => (
          <div
            key={index}
            className="flex border-b border-dark-700/30 last:border-0 group  transition-colors"
          >
            {/* Key field - with variable highlighting */}
            <div className="flex-1 border border-dark-700/30 hover:border-primary/80 focus-within:border-primary/80">
              {hasEnvData ? (
<HighlightedInput
  value={pair.key}
  onChange={(val) => handleChange(index, "key", val)}
  placeholder="Key"
  activeEnvVars={activeEnvVars}
  inactiveEnvVars={inactiveEnvVars}
  activeEnvValues={activeEnvValues}
  inactiveEnvInfo={inactiveEnvInfo}
  globalVars={globalVars}
  globalValues={globalValues}
/>
              ) : (
                <input
                  type="text"
                  placeholder="Key"
                  value={pair.key}
                  onChange={(e) => handleChange(index, "key", e.target.value)}
                  className="w-full bg-transparent px-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-primary/80 placeholder:text-dark-500 font-mono "
                />
              )}
            </div>

            {/* Value field - with variable highlighting */}
<div className="flex-1 border border-dark-700/30 hover:border-primary/80 focus-within:border-primary/80">
  {hasEnvData ? (
    <HighlightedInput
      value={pair.value}
      onChange={(val) => handleChange(index, "value", val)}
      placeholder="Value"
      activeEnvVars={activeEnvVars}
      inactiveEnvVars={inactiveEnvVars}
      activeEnvValues={activeEnvValues}
      inactiveEnvInfo={inactiveEnvInfo}
      globalVars={globalVars}
      globalValues={globalValues}
    />
  ) : (
    <input
      type="text"
      placeholder="Value"
      value={pair.value}
      onChange={(e) => handleChange(index, "value", e.target.value)}
      className="w-full bg-transparent px-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-primary/80 placeholder:text-dark-500 font-mono "
    />
  )}
</div>

            {/* Delete button */}
            <div className="w-10 flex items-center justify-center">
              <button
                onClick={() => handleRemove(index)}
                className="text-dark-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-1 rounded hover:bg-red-500/10"
                title="Delete"
                data-testid={`kv-delete-${index}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
