import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { ChevronDown, ChevronRight, Copy, Check, AlertCircle, Braces } from "lucide-react";

const LINE_HEIGHT = 20;

// Syntax colors - inline styles to prevent CSS override
const COLORS = {
  key: "#9cdcfe",
  string: "#ce9178",
  number: "#b5cea8",
  boolean: "#569cd6",
  null: "#569cd6",
  bracket: "#ffd700",
  punctuation: "#808080",
  error: "#f44747",
  lineNum: "#6b7280",
  foldedBg: "#343b5c",
  foldedText: "#888888",
};

const VAR_COLORS = {
  active: { color: "#4ade80", bg: "rgba(74, 222, 128, 0.2)" },
  inactive: { color: "#facc15", bg: "rgba(250, 204, 21, 0.2)" },
  global: { color: "#60a5fa", bg: "rgba(96, 165, 250, 0.2)" },
  missing: { color: "#f87171", bg: "rgba(248, 113, 113, 0.2)" },
};

/*
 * FIX #1: Light Theme Protection CSS
 * The user's global CSS has: [data-theme="light"] textarea { color: #000000 !important; }
 * This overrides textarea's inline color:transparent, making black text visible over syntax colors.
 * 
 * -webkit-text-fill-color has HIGHER rendering priority than color in all WebKit/Blink browsers.
 * Even if color is forced to #000 via !important, text-fill-color: transparent wins for actual rendering.
 */
const EDITOR_PROTECTION_CSS = `
.json-editor-container textarea.json-editor-textarea {
  color: transparent !important;
  -webkit-text-fill-color: transparent !important;
  caret-color: var(--color-primary, #ff5b1f) !important;
}
`;

// JSON Tokenizer
const tokenizeJSON = (json) => {
  const tokens = [];
  let i = 0;
  const len = json.length;
  const isWhitespace = (c) => c === " " || c === "\t" || c === "\n" || c === "\r";
  const isDigit = (c) => c >= "0" && c <= "9";

  while (i < len) {
    const char = json[i];
    const start = i;

    if (isWhitespace(char)) {
      while (i < len && isWhitespace(json[i])) i++;
      tokens.push({ type: "whitespace", value: json.slice(start, i) });
      continue;
    }
    if (char === '"') {
      i++;
      let escaped = false;
      while (i < len) {
        if (escaped) { escaped = false; i++; continue; }
        if (json[i] === "\\") { escaped = true; i++; continue; }
        if (json[i] === '"') { i++; break; }
        i++;
      }
      tokens.push({ type: "string", value: json.slice(start, i) });
      continue;
    }
    if (isDigit(char) || (char === "-" && isDigit(json[i + 1]))) {
      while (i < len && (isDigit(json[i]) || ".+-eE".includes(json[i]))) i++;
      tokens.push({ type: "number", value: json.slice(start, i) });
      continue;
    }
    if (json.slice(i, i + 4) === "true") { tokens.push({ type: "boolean", value: "true" }); i += 4; continue; }
    if (json.slice(i, i + 5) === "false") { tokens.push({ type: "boolean", value: "false" }); i += 5; continue; }
    if (json.slice(i, i + 4) === "null") { tokens.push({ type: "null", value: "null" }); i += 4; continue; }
    if (char === "{") { tokens.push({ type: "brace", value: "{" }); i++; continue; }
    if (char === "}") { tokens.push({ type: "brace", value: "}" }); i++; continue; }
    if (char === "[") { tokens.push({ type: "bracket", value: "[" }); i++; continue; }
    if (char === "]") { tokens.push({ type: "bracket", value: "]" }); i++; continue; }
    if (char === ":") { tokens.push({ type: "colon", value: ":" }); i++; continue; }
    if (char === ",") { tokens.push({ type: "comma", value: "," }); i++; continue; }
    tokens.push({ type: "error", value: char }); i++;
  }
  return tokens;
};

// Find foldable regions
const findFoldableRegions = (json) => {
  const regions = [], stack = [], lines = json.split("\n");
  let charIndex = 0;
  lines.forEach((line, lineIndex) => {
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const globalIndex = charIndex + i;
      const beforeChar = json.slice(0, globalIndex);
      const quoteCount = (beforeChar.match(/(?<!\\)"/g) || []).length;
      if (quoteCount % 2 === 1) continue;
      if (char === "{" || char === "[") {
        stack.push({ type: char, line: lineIndex });
      } else if (char === "}" || char === "]") {
        if (stack.length > 0) {
          const opening = stack.pop();
          if (opening.line !== lineIndex) {
            regions.push({ startLine: opening.line, endLine: lineIndex, type: opening.type === "{" ? "object" : "array" });
          }
        }
      }
    }
    charIndex += line.length + 1;
  });
  return regions;
};

/*
 * FIX #2: Smart JSON Validation with Correct Line Detection
 * 
 * Problem: JSON.parse detects a missing comma on line 6 only when it hits an
 * unexpected token at the START of line 7. So it reports "line 7" but the
 * actual fix belongs on line 6.
 * 
 * Solution: For "Expected ',' or '}'" and similar errors, if the error position
 * is near the start of the current line (meaning parser just moved to next line),
 * adjust line number back by 1.
 */
const validateJSON = (json) => {
  if (!json || json.trim() === "") return { valid: true, error: null };
  try {
    JSON.parse(json);
    return { valid: true, error: null };
  } catch (e) {
    const msg = e.message;
    let line = null;

    // Extract position from error message
    const posMatch = msg.match(/position\s*(\d+)/i);
    const lineMatch = msg.match(/line\s*(\d+)/i);

    if (lineMatch) {
      line = parseInt(lineMatch[1], 10);
    } else if (posMatch) {
      const pos = parseInt(posMatch[1], 10);
      line = json.slice(0, pos).split("\n").length;
    }

    // Smart adjustment: for missing comma/bracket errors, the problem is on the PREVIOUS line
    if (line && line > 1) {
      const isMissingTokenError =
        msg.includes("Expected ','") ||
        msg.includes("Expected '}'") ||
        msg.includes("Expected ']'") ||
        msg.includes("Unexpected string") ||
        msg.includes("Unexpected token") ||
        msg.includes("Unexpected number");

      if (isMissingTokenError) {
        const lines = json.split("\n");
        const currentLine = (lines[line - 1] || "").trimStart();
        // If error points to start of a line with a value/key, the comma is missing on prev line
        if (currentLine.startsWith('"') || currentLine.startsWith('{') || currentLine.startsWith('[') || currentLine.match(/^\d/)) {
          line = line - 1;
        }
      }
    }

    return { valid: false, error: { message: msg, line } };
  }
};

// Format JSON
const formatJSON = (json) => { try { return JSON.stringify(JSON.parse(json), null, 2); } catch { return json; } };

// Parse variables {{var}}
const parseVariables = (text) => {
  const parts = [], regex = /(\{\{[^}]+\}\})/g;
  let lastIndex = 0, match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push({ type: "text", value: text.slice(lastIndex, match.index) });
    parts.push({ type: "variable", value: match[1], name: match[1].slice(2, -2).trim() });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) parts.push({ type: "text", value: text.slice(lastIndex) });
  return parts;
};

// Get variable status
const getVarStatus = (name, activeEnvVars, inactiveEnvVars, globalVars) => {
  if (activeEnvVars?.has(name)) return "active";
  if (inactiveEnvVars?.has(name)) return "inactive";
  if (globalVars?.has(name)) return "global";
  return "missing";
};

// SYNTAX HIGHLIGHTER - ALL INLINE STYLES
const SyntaxHighlighter = React.memo(({ content, foldedLines, foldedRegions, foldableRegions, activeEnvVars, inactiveEnvVars, globalVars }) => {
  const lines = content.split("\n");

  const highlightLine = useCallback((line, lineIndex) => {
    if (foldedLines.has(lineIndex)) return null;
    const tokens = tokenizeJSON(line);
    const elements = [];

    tokens.forEach((token, idx) => {
      if (token.type === "string") {
        const parts = parseVariables(token.value);
        const isKey = tokens[idx + 1]?.type === "whitespace" ? tokens[idx + 2]?.type === "colon" : tokens[idx + 1]?.type === "colon";

        parts.forEach((part, pIdx) => {
          if (part.type === "variable") {
            const status = getVarStatus(part.name, activeEnvVars, inactiveEnvVars, globalVars);
            const vc = VAR_COLORS[status];
            elements.push(<span key={`${idx}-${pIdx}`} style={{ color: vc.color, backgroundColor: vc.bg, padding: "0 2px", borderRadius: "2px" }}>{part.value}</span>);
          } else {
            elements.push(<span key={`${idx}-${pIdx}`} style={{ color: isKey ? COLORS.key : COLORS.string }}>{part.value}</span>);
          }
        });
      } else {
        let color = null;
        if (token.type === "number") color = COLORS.number;
        else if (token.type === "boolean") color = COLORS.boolean;
        else if (token.type === "null") color = COLORS.null;
        else if (token.type === "brace" || token.type === "bracket") color = COLORS.bracket;
        else if (token.type === "colon" || token.type === "comma") color = COLORS.punctuation;
        else if (token.type === "error") color = COLORS.error;
        elements.push(<span key={idx} style={color ? { color } : undefined}>{token.value}</span>);
      }
    });

    // Folded indicator
    const foldedRegion = foldableRegions?.find(r => r.startLine === lineIndex && foldedRegions?.has(lineIndex));
    if (foldedRegion) {
      const bracket = foldedRegion.type === "object" ? "{...}" : "[...]";
      const count = foldedRegion.endLine - foldedRegion.startLine;
      elements.push(
        <span key="folded" style={{ marginLeft: "4px", padding: "1px 6px", fontSize: "11px", borderRadius: "3px", backgroundColor: COLORS.foldedBg, color: COLORS.foldedText }}>
          {bracket} <span style={{ opacity: 0.6, fontSize: "10px" }}>{count} lines</span>
        </span>
      );
    }
    return elements;
  }, [foldedLines, foldedRegions, foldableRegions, activeEnvVars, inactiveEnvVars, globalVars]);

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <div style={{ fontFamily: "monospace", fontSize: "14px", whiteSpace: "pre", lineHeight: `${LINE_HEIGHT}px` }}>
        {lines.map((line, idx) => foldedLines.has(idx) ? null : <div key={idx} style={{ height: `${LINE_HEIGHT}px` }}>{highlightLine(line, idx)}</div>)}
      </div>
    </div>
  );
});

// LINE NUMBERS - ALL INLINE STYLES
const LineNumbers = React.memo(({ content, foldedLines, foldableRegions, onToggleFold, scrollTop }) => {
  const lines = content.split("\n");
  const containerRef = useRef(null);
  useEffect(() => { if (containerRef.current) containerRef.current.scrollTop = scrollTop; }, [scrollTop]);
  const foldableLineStarts = useMemo(() => new Set(foldableRegions.map(r => r.startLine)), [foldableRegions]);
  const isFoldedStart = useCallback((lineIndex) => {
    const region = foldableRegions.find(r => r.startLine === lineIndex);
    return region ? foldedLines.has(lineIndex + 1) : false;
  }, [foldableRegions, foldedLines]);

  return (
    <div ref={containerRef} className="select-none overflow-hidden flex-shrink-0 bg-dark-800 border-r border-dark-700" style={{ width: "48px" }}>
      {lines.map((_, idx) => {
        if (foldedLines.has(idx)) return null;
        const isFoldable = foldableLineStarts.has(idx);
        const isFolded = isFoldedStart(idx);
        return (
          <div key={idx} style={{ height: `${LINE_HEIGHT}px`, display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: "8px", fontSize: "12px", fontFamily: "monospace", color: COLORS.lineNum, position: "relative" }}>
            {isFoldable && (
              <button onClick={() => onToggleFold(idx)} style={{ position: "absolute", left: "2px", width: "16px", height: "16px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "3px", border: "none", background: "transparent", cursor: "pointer", color: isFolded ? "var(--color-primary, #ff5b1f)" : COLORS.lineNum }} data-testid={`fold-btn-${idx}`}>
                {isFolded ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
              </button>
            )}
            <span style={{ fontVariantNumeric: "tabular-nums" }}>{idx + 1}</span>
          </div>
        );
      })}
    </div>
  );
});

// MAIN JSON EDITOR
const JsonEditorWithVariables = ({
  value = "", onChange, placeholder = '{\n  "key": "value"\n}',
  activeEnvVars = new Set(), inactiveEnvVars = new Set(), activeEnvValues = {}, inactiveEnvInfo = {}, globalVars = new Set(), globalValues = {},
  minHeight = 256, maxHeight = 400, className = "",
}) => {
  const textareaRef = useRef(null);
  const highlightRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [foldedRegions, setFoldedRegions] = useState(new Set());
  const [copied, setCopied] = useState(false);

  const validation = useMemo(() => validateJSON(value), [value]);
  const foldableRegions = useMemo(() => findFoldableRegions(value), [value]);
  const foldedLines = useMemo(() => {
    const hidden = new Set();
    foldableRegions.forEach((r) => { if (foldedRegions.has(r.startLine)) for (let i = r.startLine + 1; i <= r.endLine; i++) hidden.add(i); });
    return hidden;
  }, [foldableRegions, foldedRegions]);

  const handleToggleFold = useCallback((idx) => setFoldedRegions((prev) => { const next = new Set(prev); next.has(idx) ? next.delete(idx) : next.add(idx); return next; }), []);
  const handleScroll = useCallback((e) => { setScrollTop(e.target.scrollTop); setScrollLeft(e.target.scrollLeft); }, []);

  const handleKeyDown = useCallback((e) => {
    const ta = textareaRef.current; if (!ta) return;
    const { selectionStart: ss, selectionEnd: se, value: v } = ta;
    const pairs = { "{": "}", "[": "]", '"': '"' };
    if (pairs[e.key] && ss === se) { e.preventDefault(); onChange?.(v.slice(0, ss) + e.key + pairs[e.key] + v.slice(se)); setTimeout(() => ta.selectionStart = ta.selectionEnd = ss + 1, 0); return; }
    if (["]", "}", '"'].includes(e.key) && v[ss] === e.key) { e.preventDefault(); ta.selectionStart = ta.selectionEnd = ss + 1; return; }
    if (e.key === "Tab") { e.preventDefault(); onChange?.(v.slice(0, ss) + "  " + v.slice(se)); setTimeout(() => ta.selectionStart = ta.selectionEnd = ss + 2, 0); return; }
    if (e.key === "Enter") {
      e.preventDefault();
      const before = v.slice(0, ss), after = v.slice(se), line = before.split("\n").pop(), indent = line.match(/^(\s*)/)?.[1] || "";
      const cb = v[ss - 1], ca = v[ss], between = (cb === "{" && ca === "}") || (cb === "[" && ca === "]");
      let nv, co;
      if (between) { nv = before + "\n" + indent + "  \n" + indent + after; co = ss + 1 + indent.length + 2; }
      else { const ai = ["{", "[", ":"].includes(cb) ? "  " : ""; nv = before + "\n" + indent + ai + after; co = ss + 1 + indent.length + ai.length; }
      onChange?.(nv); setTimeout(() => ta.selectionStart = ta.selectionEnd = co, 0); return;
    }
    if (e.key === "Backspace" && ss === se && ss > 0) {
      const cb = v[ss - 1], ca = v[ss];
      if ((cb === "{" && ca === "}") || (cb === "[" && ca === "]") || (cb === '"' && ca === '"')) { e.preventDefault(); onChange?.(v.slice(0, ss - 1) + v.slice(ss + 1)); setTimeout(() => ta.selectionStart = ta.selectionEnd = ss - 1, 0); return; }
    }
  }, [onChange]);

  const handleFormat = useCallback(() => { if (value && validation.valid) onChange?.(formatJSON(value)); }, [value, validation.valid, onChange]);
  const handleCopy = useCallback(async () => { try { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {} }, [value]);

  const shortErr = (err) => { if (!err) return ""; let m = err.message.replace("JSON.parse: ", ""); if (m.length > 25) m = m.slice(0, 25) + "..."; return err.line ? `${m} (Ln ${err.line})` : m; };

  return (
    <div className={`json-editor-container rounded-lg border border-dark-700 overflow-hidden flex flex-col ${className}`} data-testid="json-editor">
      {/* FIX #1: Inject CSS that protects textarea transparency from light theme overrides */}
      <style>{EDITOR_PROTECTION_CSS}</style>

      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-dark-800 border-b border-dark-700">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-shrink-0">
            <Braces size={16} style={{ color: COLORS.lineNum }} />
            <span style={{ fontSize: "12px", fontWeight: 500, color: "#d1d5db" }}>JSON</span>
          </div>
          {/* Error inline */}
          {!validation.valid && validation.error && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "2px 8px", borderRadius: "4px", fontSize: "11px", backgroundColor: "rgba(239,68,68,0.15)", color: "#f87171", maxWidth: "280px", overflow: "hidden" }} title={validation.error.message} data-testid="json-error-msg">
              <AlertCircle size={12} style={{ flexShrink: 0 }} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{shortErr(validation.error)}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {value && (
            <div style={{ display: "flex", alignItems: "center", gap: "4px", padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 500, border: "1px solid", ...(validation.valid ? { backgroundColor: "rgba(34,197,94,0.2)", color: "#4ade80", borderColor: "rgba(34,197,94,0.3)" } : { backgroundColor: "rgba(239,68,68,0.2)", color: "#f87171", borderColor: "rgba(239,68,68,0.3)" }) }} data-testid="json-validation-badge">
              {validation.valid ? <><Check size={12} /> Valid</> : <><AlertCircle size={12} /> Invalid</>}
            </div>
          )}
          <button onClick={handleFormat} disabled={!validation.valid} className="hover:bg-dark-600" style={{ padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 500, color: validation.valid ? "#9ca3af" : "#4b5563", cursor: validation.valid ? "pointer" : "not-allowed", border: "none", background: "transparent" }} title="Format" data-testid="format-btn">Format</button>
          <button onClick={handleCopy} className="hover:bg-dark-600" style={{ padding: "4px", borderRadius: "4px", border: "none", background: "transparent", cursor: "pointer", color: "#9ca3af" }} title="Copy" data-testid="copy-btn">
            {copied ? <Check size={16} style={{ color: "#4ade80" }} /> : <Copy size={16} />}
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex flex-1 overflow-hidden" style={{ minHeight, maxHeight }}>
        <LineNumbers content={value} foldedLines={foldedLines} foldableRegions={foldableRegions} onToggleFold={handleToggleFold} scrollTop={scrollTop} />
        <div className="relative flex-1 overflow-hidden ">
          <div ref={highlightRef} style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", padding: "8px 8px 8px 12px" }}>
            <div style={{ transform: `translate(-${scrollLeft}px, -${scrollTop}px)` }}>
              <SyntaxHighlighter content={value} foldedLines={foldedLines} foldedRegions={foldedRegions} foldableRegions={foldableRegions} activeEnvVars={activeEnvVars} inactiveEnvVars={inactiveEnvVars} globalVars={globalVars} />
            </div>
          </div>
          {/* FIX #1: Added json-editor-textarea class - CSS protection targets this */}
          <textarea ref={textareaRef} value={value} onChange={(e) => onChange?.(e.target.value)} onScroll={handleScroll} onKeyDown={handleKeyDown} placeholder={placeholder} spellCheck={false} className="json-editor-textarea" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", resize: "none", padding: "8px", fontFamily: "monospace", fontSize: "14px", lineHeight: `${LINE_HEIGHT}px`, backgroundColor: "transparent", color: "transparent", caretColor: "var(--color-primary, #ff5b1f)", outline: "none", border: "none", whiteSpace: "pre", overflow: "auto" }} data-testid="json-textarea" />
          {!value && <div style={{ position: "absolute", top: "8px", left: "8px", pointerEvents: "none", fontFamily: "monospace", fontSize: "14px", lineHeight: `${LINE_HEIGHT}px`, color: "#4b5563", whiteSpace: "pre" }}>{placeholder}</div>}
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-3 py-1 border-t border-dark-700 bg-dark-800" style={{ fontSize: "11px", color: COLORS.lineNum }}>
        <div className="flex items-center gap-4"><span>Ln {value.split("\n").length}</span><span>Ch {value.length}</span></div>
        <div className="flex items-center gap-4">{foldedRegions.size > 0 && <span>{foldedRegions.size} folded</span>}<span>UTF-8</span></div>
      </div>
    </div>
  );
};

export default JsonEditorWithVariables;