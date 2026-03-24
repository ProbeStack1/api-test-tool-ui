/**
 * VariableHighlightInput.jsx
 * 
 * A smart input component that highlights {{variableName}} patterns
 * with different colors based on variable availability:
 * 
 * - BLUE: Variable exists in ACTIVE environment (shows value on hover)
 * - YELLOW/ORANGE: Variable exists in INACTIVE environment (shows "activate first" message)
 * - RED: Variable doesn't exist in any environment (shows "not found" message)
 * 
 * The component displays variable names in UI but sends actual values in payload.
 */

import React, { useState, useRef, useCallback, useMemo, useEffect, useLayoutEffect } from 'react';
import ReactDOM from 'react-dom';
import clsx from 'clsx';

/**
 * Parses text and identifies all {{variable}} patterns
 * @param {string} text - Input text to parse
 * @returns {Array} - Array of segments with type (text/variable) and content
 */
const parseVariables = (text) => {
  if (!text) return [{ type: 'text', content: '' }];
  
  const regex = /(\{\{[^}]+\}\})/g;
  const parts = text.split(regex);
  
  return parts.map((part) => {
    if (part.match(/^\{\{[^}]+\}\}$/)) {
      const varName = part.slice(2, -2); // Remove {{ and }}
      return { type: 'variable', content: part, varName };
    }
    return { type: 'text', content: part };
  }).filter(p => p.content !== '');
};

/**
 * Gets variable status and value based on environment state
 * @param {string} varName - Variable name without braces
 * @param {Set} activeEnvVars - Set of variable names in active environment
 * @param {Set} inactiveEnvVars - Set of variable names in inactive environments
 * @param {Object} activeEnvValues - Map of varName -> value for active env
 * @param {Object} inactiveEnvInfo - Map of varName -> { envName, value } for inactive envs
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
 * Variable Badge Component - renders a highlighted variable
 * IMPORTANT: No padding/border/margin on the badge text itself.
 * Only color + background-color are used so the overlay text occupies
 * the exact same pixel width as the transparent input text underneath.
 * This prevents cursor-position offset bugs.
 * Uses ReactDOM.createPortal for tooltip so it escapes overflow-hidden.
 */
const VariableBadge = ({ varName, status, tooltip }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const spanRef = useRef(null);

  const colorClass = {
    active: 'text-blue-500',
    inactive: 'text-yellow-500',
    global: 'text-purple-500',
    missing: 'text-red-500'
  };
  const bgColor = {
    active: 'rgba(96,165,250,0.18)',
    inactive: 'rgba(250,204,21,0.18)',
    global: 'rgba(168,85,247,0.18)',
    missing: 'rgba(248,113,113,0.18)'
  };

  const tooltipBorder = {
    active: 'border-blue-400/30 text-blue-300',
    inactive: 'border-yellow-400/30 text-yellow-300',
    global: 'border-purple-400/30 text-purple-300',
    missing: 'border-red-400/30 text-red-300'
  };

  const handleMouseEnter = () => {
    if (spanRef.current) {
      const rect = spanRef.current.getBoundingClientRect();
      setTooltipPos({
        top: rect.top - 8,
        left: rect.left + rect.width / 2,
      });
      setShowTooltip(true);
    }
  };

  return (
    <>
      <span
        ref={spanRef}
        className={clsx("cursor-help pointer-events-auto", colorClass[status])}
        style={{ backgroundColor: bgColor[status], borderRadius: '2px' }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {`{{${varName}}}`}
      </span>
      {showTooltip && ReactDOM.createPortal(
        <div
          className={clsx(
            "fixed px-3 py-2 text-xs rounded-lg shadow-xl z-[200]",
            "whitespace-normal break-words max-w-[280px] pointer-events-none",
            "bg-dark-800 border",
            tooltipBorder[status]
          )}
          style={{
            top: tooltipPos.top,
            left: tooltipPos.left,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-dark-800" />
          {tooltip}
        </div>,
        document.body
      )}
    </>
  );
};

/**
 * Main VariableHighlightInput Component
 * 
 * @param {string} value - Current input value
 * @param {function} onChange - Change handler
 * @param {string} placeholder - Placeholder text
 * @param {string} className - Additional CSS classes
 * @param {Set} activeEnvVars - Variables in active environment
 * @param {Set} inactiveEnvVars - Variables in inactive environments  
 * @param {Object} activeEnvValues - Values map for active env
 * @param {Object} inactiveEnvInfo - Info map for inactive envs
 * @param {Set} globalVars - Variables in global scope
 * @param {Object} globalValues - Values map for global vars
 * @param {boolean} multiline - Use textarea instead of input
 * @param {Object} ...props - Additional props passed to input
 */
const VariableHighlightInput = ({
  value = '',
  onChange,
  placeholder = '',
  className = '',
  inputClassName = '',
  activeEnvVars = new Set(),
  inactiveEnvVars = new Set(),
  activeEnvValues = {},
  inactiveEnvInfo = {},
  globalVars = new Set(),      
  globalValues = {},  
  multiline = false,
  disabled = false,
  ...props
}) => {
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  const overlayRef = useRef(null);
  const [isFocused, setIsFocused] = useState(false);

  // Parse the value into segments
  const segments = useMemo(() => parseVariables(value), [value]);

  // Check if there are any variables
  const hasVariables = segments.some(s => s.type === 'variable');

  /**
   * Sync overlay padding with the wrapper's computed padding.
   * The overlay is absolute inset-0 (covers the wrapper's padding box).
   * The input (normal flow) sits in the wrapper's content area.
   * So overlay needs padding = wrapper's padding to align text with input.
   */
  useLayoutEffect(() => {
    if (!wrapperRef.current || !overlayRef.current || !hasVariables) return;
    const cs = getComputedStyle(wrapperRef.current);
    const ol = overlayRef.current;
    ol.style.paddingLeft = cs.paddingLeft;
    ol.style.paddingRight = cs.paddingRight;
    ol.style.paddingTop = cs.paddingTop;
    ol.style.paddingBottom = cs.paddingBottom;
  });

  // Sync scroll between input and overlay
  const handleScroll = useCallback(() => {
    if (overlayRef.current && inputRef.current) {
      overlayRef.current.scrollLeft = inputRef.current.scrollLeft;
      overlayRef.current.scrollTop = inputRef.current.scrollTop;
    }
  }, []);

  // Handle input change
  const handleChange = (e) => {
    onChange?.(e.target.value);
  };

  // Render highlighted overlay
  const renderOverlay = () => {
    return segments.map((segment, index) => {
      if (segment.type === 'variable') {
        const varStatus = getVariableStatus(
    segment.varName,
    activeEnvVars,
    inactiveEnvVars,
    globalVars,
    activeEnvValues,
    inactiveEnvInfo,
    globalValues
        );
        
        return (
          <VariableBadge
            key={`${segment.varName}-${index}`}
            varName={segment.varName}
            status={varStatus.status}
            tooltip={varStatus.tooltip}
          />
        );
      }
      
      // Regular text - show in normal color so user can read the full URL
      return (
        <span key={index} className="text-gray-200">
          {segment.content}
        </span>
      );
    });
  };

  const InputComponent = multiline ? 'textarea' : 'input';

  // Default visual styles when no className is provided
  const defaultWrapperClass = "border border-dark-700 rounded-lg px-3 py-2 bg-transparent";

  return (
    <div
      ref={wrapperRef}
      className={clsx(
        "relative",
        className || defaultWrapperClass,
        isFocused && "ring-2 ring-primary/30"
      )}
    >
      {/* Input: NO border, NO padding. Text starts at wrapper's content edge. */}
      <InputComponent
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleChange}
        onScroll={handleScroll}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        disabled={disabled}
        className={clsx(
          "w-full bg-transparent border-0 p-0 outline-none ring-0",
          "text-sm font-mono",
          hasVariables ? "text-transparent caret-white" : "text-white",
          "placeholder:text-gray-500",
          disabled && "opacity-50 cursor-not-allowed",
          multiline && "min-h-[100px] resize-y",
          inputClassName 
        )}
        {...props}
      />

      {/* Highlight Overlay:
          - absolute inset-0 covers wrapper's padding box
          - padding is synced dynamically from wrapper's computed padding
          - this ensures overlay text starts at the same pixel as input text */}
      {hasVariables && (
        <div
          ref={overlayRef}
          className={clsx(
            "absolute inset-0 pointer-events-none overflow-hidden z-10",
            "font-mono text-sm",
            multiline
              ? "whitespace-pre-wrap break-words overflow-y-hidden"
              : "whitespace-pre flex items-center"
          )}
        >
          {renderOverlay()}
        </div>
      )}
    </div>
  );
};

/**
 * Helper hook to get variable maps from environments
 * @param {Array} environments - List of all environments
 * @returns {Object} - { activeEnvVars, inactiveEnvVars, activeEnvValues, inactiveEnvInfo }
 */
export const useVariableMaps = (environments = []) => {
  return useMemo(() => {
    const activeEnvVars = new Set();
    const inactiveEnvVars = new Set();
    const activeEnvValues = {};
    const inactiveEnvInfo = {};

    environments.forEach(env => {
      if (env.id === 'no-env' || !env.variables) return;
      
      env.variables.forEach(v => {
        if (!v.key) return;
        
        if (env.isActive) {
          activeEnvVars.add(v.key);
          activeEnvValues[v.key] = v.value || '';
        } else {
          if (!activeEnvVars.has(v.key)) {
            inactiveEnvVars.add(v.key);
            inactiveEnvInfo[v.key] = {
              envName: env.name,
              value: v.value || ''
            };
          }
        }
      });
    });

    return { activeEnvVars, inactiveEnvVars, activeEnvValues, inactiveEnvInfo };
  }, [environments]);
};

/**
 * Substitutes variables in text with actual values
 * Used for sending actual values in payload
 * @param {string} text - Text with {{variables}}
 * @param {Object} activeEnvValues - Map of varName -> value
 * @returns {string} - Text with variables replaced by values
 */
export const substituteVariables = (text, activeEnvValues = {}) => {
  if (!text) return text;
  return text.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
    return activeEnvValues[varName] !== undefined ? activeEnvValues[varName] : match;
  });
};

export default VariableHighlightInput;
