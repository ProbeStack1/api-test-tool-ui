import React, { useState, useEffect, useRef, useMemo } from 'react';
import Editor, { loader } from '@monaco-editor/react';
import {
  Plus, Upload, X, Edit2, Trash2,
  FileCode, Check, Search, Download, Save,
  Zap, ChevronLeft, ChevronRight, ChevronDown, ListChecks, RefreshCw,
  Settings2,
} from 'lucide-react';
import { toast } from 'sonner';
import clsx from 'clsx';
import {
  listTestSpecs,
  createTestSpec,
  updateTestSpec,
  deleteTestSpec,
  generateTestCases,
  listTestCases,
  getTestSpec,
  listArchivedTestSpecs,
  restoreTestSpec,
  permanentDeleteTestSpec,
  isUnchangedContentError,
} from '../services/testSpecificationService';
import { listLibraryItems } from '../services/specLibraryService';
import DeleteWithRetentionModal from './common/DeleteWithRetentionModal';
import { ArchivedItemsView, ArchiveViewTrigger } from './common/ArchivedItemsPanel';

const BLANK_SPEC_TEMPLATE = {
  openapi: '3.0.0',
  info: { title: 'Test Case Specification', version: '1.0.0', description: 'API test case specification' },
  paths: {},
  components: { schemas: {} },
};

// ── Monaco options ────────────────────────────────────────────────────────────
const getMonacoOptions = (_isDark) => ({
  fontSize: 13, lineHeight: 20, minimap: { enabled: false }, wordWrap: 'on',
  scrollBeyondLastLine: false, smoothScrolling: true, automaticLayout: true,
  tabSize: 2, insertSpaces: true, renderWhitespace: 'selection',
  bracketPairColorization: { enabled: true }, formatOnPaste: true, formatOnType: true,
});
const MONACO_READONLY = (isDark) => ({
  ...getMonacoOptions(isDark), readOnly: true, lineNumbers: 'off', glyphMargin: false, folding: false,
});

const TEST_CASES_LIMIT = 10;

// ── Monaco theme helpers ─────────────────────────────────────────────────────
// Converts any CSS color (rgb/rgba/hex/named) to a 6-digit hex string.
const colorToHex = (color) => {
  if (!color) return null;
  if (color.startsWith('#')) return color.length === 7 ? color : null;
  const m = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (!m) return null;
  const h = (n) => Number(n).toString(16).padStart(2, '0');
  return `#${h(m[1])}${h(m[2])}${h(m[3])}`;
};

/**
 * Registers a Monaco theme `probestack-dark` whose `editor.background` matches
 * the actual computed background of the supplied wrapper element — so the
 * editor blends with `bg-probestack-bg`. Re-registering with a fresh hex
 * simply overwrites the previous definition, so this is safe to call from
 * every editor's `onMount`.
 */
const applyProbestackDarkTheme = (monaco, wrapper) => {
  // Use the actual painted color of the wrapper. Fall back to a safe dark hex
  // so the editor never reverts to Monaco's default #1e1e1e.
  const computedBg = wrapper ? window.getComputedStyle(wrapper).backgroundColor : null;
  const hex = colorToHex(computedBg) || '#0f1419';
  try {
    monaco.editor.defineTheme('probestack-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': hex,
        'editorGutter.background': hex,
        'minimap.background': hex,
      },
    });
    monaco.editor.setTheme('probestack-dark');
  } catch {
    /* ignore */
  }
};

// Hook for any Monaco <Editor/> — attaches a wrapper ref + returns an
// onMount handler that applies `probestack-dark` when dark theme is active.
const useProbestackEditor = (isDark) => {
  const wrapperRef = useRef(null);
  const onMount = (_editor, monaco) => {
    if (!isDark) return;
    // Defer one frame so the wrapper div has painted its bg color.
    requestAnimationFrame(() => applyProbestackDarkTheme(monaco, wrapperRef.current));
  };
  return { wrapperRef, onMount };
};

// Pre-register `probestack-dark` on the global Monaco instance BEFORE any
// editor mounts — this eliminates the first-paint flash of Monaco's default
// `vs-dark` background. The hex below intentionally matches the Tailwind
// `bg-probestack-bg` token; `onMount` later refines it to the exact computed
// wrapper background for pixel-perfect blending.
loader.init().then((monaco) => {
  try {
    monaco.editor.defineTheme('probestack-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#0f1419',
        'editorGutter.background': '#0f1419',
        'minimap.background': '#0f1419',
      },
    });
  } catch {
    /* ignore */
  }
}).catch(() => { /* ignore */ });

const FORMAT_OPTIONS = [
  { value: '',        label: 'Auto-detect',       hint: 'Detect from spec content' },
  { value: 'openapi', label: 'OpenAPI / Swagger', hint: 'OpenAPI 2.0 or 3.x JSON' },
  { value: 'postman', label: 'Postman Collection', hint: 'Postman v2 / v2.1 JSON' },
];

const TEST_GROUPS = [
  { key: 'includeNegativeTests',    label: 'Negative',    hint: 'Wrong method, empty body, invalid JSON, missing headers' },
  { key: 'includeSecurityTests',    label: 'Security',    hint: 'Missing auth, invalid credentials (when auth is declared)' },
  { key: 'includePerformanceTests', label: 'Performance', hint: 'Response-time threshold check' },
  { key: 'includeBoundaryTests',    label: 'Boundary',    hint: 'Large payload, special characters, SQL/XSS patterns' },
];

const getSourceDisplay = (source) => {
  switch (source) {
    case 'upload':  return { label: 'Uploaded', color: 'text-green-400 bg-green-400/10' };
    case 'url':     return { label: 'From URL', color: 'text-blue-400 bg-blue-400/10' };
    case 'library': return { label: 'Library',  color: 'text-purple-400 bg-purple-400/10' };
    default:        return { label: source || 'Unknown', color: 'text-gray-400 bg-gray-400/10' };
  }
};

const METHOD_COLORS = {
  GET:    'bg-green-500/15 text-green-400 border-green-500/30',
  POST:   'bg-blue-500/15 text-blue-400 border-blue-500/30',
  PUT:    'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  PATCH:  'bg-orange-500/15 text-orange-400 border-orange-500/30',
  DELETE: 'bg-red-500/15 text-red-400 border-red-500/30',
};
const methodColor = (m) =>
  METHOD_COLORS[(m || '').toUpperCase()] || 'bg-gray-500/15 text-gray-400 border-gray-500/30';

const CATEGORY_BADGE = {
  POSITIVE:    { label: 'Positive',    className: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' },
  NEGATIVE:    { label: 'Negative',    className: 'bg-red-500/10 text-red-300 border-red-500/30' },
  SECURITY:    { label: 'Security',    className: 'bg-purple-500/10 text-purple-300 border-purple-500/30' },
  PERFORMANCE: { label: 'Performance', className: 'bg-blue-500/10 text-blue-300 border-blue-500/30' },
  BOUNDARY:    { label: 'Boundary',    className: 'bg-orange-500/10 text-orange-300 border-orange-500/30' },
  VALIDATION:  { label: 'Validation',  className: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30' },
};
const PRIORITY_BADGE = {
  HIGH:   'bg-red-500/15 text-red-300 border-red-500/30',
  MEDIUM: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  LOW:    'bg-gray-500/15 text-gray-300 border-gray-500/30',
};

// ─── TestCaseCard — compact header, expandable details ───────────────────────
function TestCaseCard({ tc }) {
  const [expanded, setExpanded] = useState(false);
  const [showReq, setShowReq] = useState(false);
  const [showRes, setShowRes] = useState(false);
  const [showScript, setShowScript] = useState(false);
  const [isDark, setIsDark] = useState(true);

  // Each editor needs its own wrapper ref + onMount.
  const reqEd = useProbestackEditor(isDark);
  const resEd = useProbestackEditor(isDark);
  const scriptEd = useProbestackEditor(isDark);

  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(() => {
      setIsDark(root.getAttribute('data-theme') !== 'light');
    });
    observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    setIsDark(root.getAttribute('data-theme') !== 'light');
    return () => observer.disconnect();
  }, []);

  const formatSample = (raw) => {
    if (!raw) return '';
    try { return JSON.stringify(JSON.parse(raw), null, 2); } catch { return raw; }
  };

  const editorTheme = isDark ? 'probestack-dark' : 'light';

  const categoryBadge = CATEGORY_BADGE[tc.category];
  const priorityClass = PRIORITY_BADGE[tc.priority];
  const effectiveMethod = tc.overrideMethod || tc.method;
  const effectiveUrl = tc.overrideUrl || tc.url || tc.endpoint;
  const requestBody = tc.overrideBody != null ? tc.overrideBody : (tc.originalBody || tc.requestBodySample);

  return (
    <div
      className={clsx(
        'border rounded-lg bg-probestack-bg overflow-hidden transition-all',
        expanded ? 'border-primary/40' : 'border-dark-700 hover:border-dark-600'
      )}
      data-testid={`testcase-card-${tc.id}`}
    >
      {/* ── Compact header (clickable) ────────────────────────────────────── */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full text-left px-4 py-2.5 flex items-center gap-3 group"
      >
        <div className="flex flex-col gap-1.5 shrink-0 min-w-[5.5rem]">
          {categoryBadge && (
            <span className={clsx('text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wide text-center', categoryBadge.className)}>
              {categoryBadge.label}
            </span>
          )}
          {tc.priority && priorityClass && (
            <span className={clsx('text-[9px] font-semibold px-1.5 py-0.5 rounded border uppercase tracking-wide text-center', priorityClass)}>
              {tc.priority}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={clsx('text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase', methodColor(effectiveMethod))}>
              {effectiveMethod}
            </span>
            <span className="font-mono text-xs text-[var(--color-text-primary)] truncate flex-1 min-w-[8rem]">
              {effectiveUrl}
            </span>
            {tc.expectedStatus && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-dark-700 text-gray-300 border border-dark-600 font-mono">
                → {tc.expectedStatus}
              </span>
            )}
          </div>
          <p className="text-[11px] text-[var(--color-text-secondary)] mt-1 truncate">
            {tc.name}
          </p>
        </div>

        <ChevronDown
          className={clsx(
            'h-4 w-4 text-gray-400 shrink-0 transition-transform group-hover:text-white',
            expanded && 'rotate-180'
          )}
        />
      </button>

      {/* ── Expanded details ─────────────────────────────────────────────── */}
      {expanded && (
        <div className="px-4 pb-3 border-t border-dark-700 pt-3 space-y-2.5 bg-probestack-bg">
          {/* Meta row */}
          <div className="flex items-center gap-2 flex-wrap">
            {tc.testType && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-dark-700 text-gray-300 border border-dark-600">
                {tc.testType}
              </span>
            )}
            {tc.folderPath && (
              <span className="text-xs text-gray-500">· {tc.folderPath}</span>
            )}
            {tc.endpointName && tc.endpointName !== tc.name && (
              <span className="text-xs text-gray-500 ml-auto">{tc.endpointName}</span>
            )}
          </div>

          {tc.description && (
            <p className="text-xs text-[var(--color-text-secondary)]">{tc.description}</p>
          )}

          {tc.expectedBehavior && (
            <p className="text-xs text-gray-500">
              <span className="text-gray-400 font-medium">Expected:</span> {tc.expectedBehavior}
            </p>
          )}

          {tc.parameters?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tc.parameters.map((p, i) => (
                <span key={i} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-dark-700 text-gray-300 border border-dark-600">
                  <span className="text-gray-500">{p.in}</span>
                  <span className="text-white font-medium">{p.name}</span>
                  {p.required && <span className="text-red-400">*</span>}
                </span>
              ))}
            </div>
          )}

          {requestBody && (
            <div>
              <button onClick={() => setShowReq(v => !v)} className="text-[11px] text-blue-400 hover:text-blue-300 transition-colors">
                {showReq ? '▼' : '▶'} Request body {tc.overrideBody != null && <span className="text-amber-400">(overridden)</span>}
              </button>
              {showReq && (
                <div ref={reqEd.wrapperRef} className={clsx('mt-1.5 rounded overflow-hidden border border-dark-700', isDark && 'bg-probestack-bg')} style={{ height: 120 }}>
                  <Editor value={formatSample(requestBody)} language="json" theme={editorTheme}
                    onMount={reqEd.onMount}
                    options={MONACO_READONLY(isDark)} height={120} />
                </div>
              )}
            </div>
          )}

          {tc.responseSample && (
            <div>
              <button onClick={() => setShowRes(v => !v)} className="text-[11px] text-green-400 hover:text-green-300 transition-colors">
                {showRes ? '▼' : '▶'} Response sample
              </button>
              {showRes && (
                <div ref={resEd.wrapperRef} className={clsx('mt-1.5 rounded overflow-hidden border border-dark-700', isDark && 'bg-probestack-bg')} style={{ height: 120 }}>
                  <Editor value={formatSample(tc.responseSample)} language="json" theme={editorTheme}
                    onMount={resEd.onMount}
                    options={MONACO_READONLY(isDark)} height={120} />
                </div>
              )}
            </div>
          )}

          {tc.generatedTestScript && (
            <div>
              <button onClick={() => setShowScript(v => !v)} className="text-[11px] text-purple-400 hover:text-purple-300 transition-colors">
                {showScript ? '▼' : '▶'} Test script (pm.test)
              </button>
              {showScript && (
                <div ref={scriptEd.wrapperRef} className={clsx('mt-1.5 rounded overflow-hidden border border-dark-700', isDark && 'bg-probestack-bg')} style={{ height: 160 }}>
                  <Editor value={tc.generatedTestScript} language="javascript" theme={editorTheme}
                    onMount={scriptEd.onMount}
                    options={MONACO_READONLY(isDark)} height={160} />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── GeneratorSettingsPopover — production generator controls ─────────────────
function GeneratorSettingsPopover({ format, setFormat, opts, setOpts }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (!e.target.closest('[data-gen-settings]')) setOpen(false);
    };
    window.addEventListener('click', onDoc);
    return () => window.removeEventListener('click', onDoc);
  }, [open]);

  const activeGroups = TEST_GROUPS.filter(g => opts[g.key]).length;
  const summary = activeGroups === TEST_GROUPS.length
    ? 'All groups'
    : activeGroups === 0
      ? 'Positive only'
      : `+${activeGroups} group${activeGroups !== 1 ? 's' : ''}`;

  return (
    <div className="relative" data-gen-settings>
      <button
        onClick={() => setOpen(v => !v)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-dark-600 bg-[var(--color-card-bg)] text-xs text-[var(--color-text-primary)] hover:bg-dark-700 hover:border-dark-500 transition-colors"
        title="Generator settings"
        data-testid="generator-settings-trigger"
      >
        <Settings2 className="h-3.5 w-3.5 text-gray-400" />
        <span className="max-w-[9rem] text-xs truncate">{summary}</span>
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-[22rem] z-30 bg-[var(--color-input-bg)] border border-dark-700 rounded-lg shadow-xl p-3"
          data-testid="generator-settings-popover"
        >
          {/* Format — segmented pill group */}
          <div className="mb-3">
            <p className="text-xs uppercase tracking-wider text-gray-500 mb-1.5 font-semibold">
              Spec format
            </p>
            <div className="grid grid-cols-3 gap-1 p-0.5 rounded-md bg-[var(--color-card-bg)]/60 border border-dark-700">
              {FORMAT_OPTIONS.map((o) => {
                const active = (format || '') === o.value;
                return (
                  <button
                    key={o.value || 'auto'}
                    onClick={() => setFormat(o.value)}
                    title={o.hint}
                    className={clsx(
                      'px-2 py-1.5 rounded-md text-xs font-medium transition-colors',
                      active
                        ? 'bg-primary text-white shadow'
                        : 'text-gray-400 hover:text-white hover:bg-dark-700'
                    )}
                  >
                    {o.label === 'OpenAPI / Swagger' ? 'OpenAPI' : o.label === 'Postman Collection' ? 'Postman' : o.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Test groups — 2-col checkbox chips */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold">
                Test groups
              </p>
              <p className="text-xs text-gray-500">Positive + Validation always on</p>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {TEST_GROUPS.map((g) => {
                const on = !!opts[g.key];
                return (
                  <label
                    key={g.key}
                    title={g.hint}
                    className={clsx(
                      'flex items-center gap-1.5 px-2 py-1.5 rounded-md border cursor-pointer text-xs transition-colors',
                      on
                        ? 'border-primary/40 bg-primary/10 text-[var(--color-text-primary)]'
                        : 'border-dark-700 bg-[var(--color-card-bg)]/40 text-gray-400 hover:border-dark-600 hover:text-gray-200'
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={(e) => setOpts({ ...opts, [g.key]: e.target.checked })}
                      className="h-3 w-3 accent-primary shrink-0"
                      data-testid={`gen-opt-${g.key}`}
                    />
                    <span className="font-medium">{g.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Threshold — always visible, disabled when performance off */}
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500 mb-1.5 font-semibold">
              Response-time threshold
            </p>
            <div className={clsx(
              'flex items-center gap-2',
              !opts.includePerformanceTests && 'opacity-50'
            )}>
              <input
                type="number"
                min={100}
                step={100}
                value={opts.responseTimeThresholdMs}
                onChange={(e) => setOpts({ ...opts, responseTimeThresholdMs: Math.max(100, Number(e.target.value) || 100) })}
                disabled={!opts.includePerformanceTests}
                className="flex-1 bg-[var(--color-card-bg)] border border-dark-700 rounded-md px-2.5 py-1.5 text-xs text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:cursor-not-allowed"
                data-testid="gen-opt-threshold"
              />
              <span className="text-xs text-gray-400">ms</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── TestCasesView ────────────────────────────────────────────────────────────
function TestCasesView({
  testCases, total, offset, loading, onPageChange,
  onGenerate, onForceRegenerate, generating, noChangesDetected,
}) {
  const [categoryFilter, setCategoryFilter] = useState(null);
  const totalPages = Math.max(1, Math.ceil(total / TEST_CASES_LIMIT));
  const currentPage = Math.floor(offset / TEST_CASES_LIMIT) + 1;

  // When the source list changes, clear the filter to avoid orphan state.
  useEffect(() => {
    if (categoryFilter && !testCases.some(tc => tc.category === categoryFilter)) {
      setCategoryFilter(null);
    }
  }, [testCases, categoryFilter]);

  const visibleCases = useMemo(
    () => categoryFilter ? testCases.filter(tc => tc.category === categoryFilter) : testCases,
    [testCases, categoryFilter]
  );

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 rounded-lg bg-probestack-bg animate-pulse" />
        ))}
      </div>
    );
  }

  if (testCases.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
        <ListChecks className="h-12 w-12 text-gray-600" />
        <div>
          <p className="text-[var(--color-text-primary)] font-medium">No test cases generated yet</p>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            Click "Generate" to parse this spec and create test cases for each endpoint.
          </p>
        </div>
        <button
          onClick={onGenerate}
          disabled={generating}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600
                     text-white font-medium text-sm hover:from-orange-600 hover:to-orange-700 transition-all
                     shadow-lg shadow-orange-500/25 disabled:opacity-60 disabled:cursor-not-allowed"
          data-testid="generate-empty-btn"
        >
          <Zap className={clsx('h-4 w-4', generating && 'animate-spin')} />
          {generating ? 'Generating…' : 'Generate Test Cases'}
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Coverage summary — clickable to filter */}
      {testCases.length > 0 && (() => {
        const counts = testCases.reduce((acc, tc) => {
          const key = tc.category || 'OTHER';
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {});
        const ordered = ['POSITIVE', 'NEGATIVE', 'SECURITY', 'PERFORMANCE', 'BOUNDARY', 'VALIDATION']
          .filter(k => counts[k]);
        return (
          <div className="flex items-center gap-2 px-4 py-2 border-b border-dark-700 bg-[var(--color-card-bg)]/30 overflow-x-auto">
            <span className="text-sm text-gray-500 shrink-0">Filter:</span>
            <button
              onClick={() => setCategoryFilter(null)}
              className={clsx(
                'inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border transition-colors shrink-0',
                categoryFilter === null
                  ? 'bg-white/10 text-white border-white/30 ring-1 ring-white/20'
                  : 'bg-transparent text-gray-400 border-dark-600 hover:border-dark-500 hover:text-gray-200'
              )}
              data-testid="coverage-filter-all"
            >
              All
              <span className="bg-white/10 px-1 rounded">{testCases.length}</span>
            </button>
            {ordered.map(key => {
              const badge = CATEGORY_BADGE[key];
              const active = categoryFilter === key;
              return (
                <button
                  key={key}
                  onClick={() => setCategoryFilter(active ? null : key)}
                  className={clsx(
                    'inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border transition-all shrink-0',
                    active
                      ? badge.className + ' ring-2 ring-current/80 scale-102'
                      : badge.className + ' opacity-90 hover:opacity-100'
                  )}
                  data-testid={`coverage-filter-${key.toLowerCase()}`}
                >
                  {badge.label}
                  <span className="bg-white/10 px-1 rounded">{counts[key]}</span>
                </button>
              );
            })}
            {categoryFilter && (
              <span className="ml-auto text-xs text-gray-400 shrink-0">
                Showing {visibleCases.length} of {testCases.length}
              </span>
            )}
          </div>
        );
      })()}

      {noChangesDetected && (
        <div
          className="mx-4 mt-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-between gap-3"
          data-testid="no-changes-banner"
        >
          <div className="flex items-center gap-2 text-sm text-blue-300">
            <RefreshCw className="h-4 w-4" />
            <span>
              The spec is the same as the last generation. These test cases are the
              previously generated ones. Make changes or regenerate anyway to rebuild.
            </span>
          </div>
          <button
            onClick={onForceRegenerate}
            disabled={generating}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
            data-testid="force-regenerate-btn-banner"
          >
            <Zap className={clsx('h-3.5 w-3.5', generating && 'animate-spin')} />
            {generating ? 'Regenerating…' : 'Regenerate anyway'}
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {visibleCases.map((tc) => <TestCaseCard key={tc.id} tc={tc} />)}
        {visibleCases.length === 0 && categoryFilter && (
          <div className="text-center py-8 text-xs text-gray-500">
            No test cases in this category.
          </div>
        )}
      </div>

      {!categoryFilter && total > TEST_CASES_LIMIT && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-dark-700 bg-[var(--color-card-bg)]/30">
          <span className="text-xs text-[var(--color-text-secondary)]">
            {total} test case{total !== 1 ? 's' : ''} total
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(offset - TEST_CASES_LIMIT)}
              disabled={offset === 0}
              className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-dark-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs text-[var(--color-text-primary)]">Page {currentPage} of {totalPages}</span>
            <button
              onClick={() => onPageChange(offset + TEST_CASES_LIMIT)}
              disabled={offset + TEST_CASES_LIMIT >= total}
              className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-dark-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function GenerateTestCase({ projects, activeWorkspaceId, currentUserId }) {
  const [specs, setSpecs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeSpecId, setActiveSpecId] = useState(null);
  const [editorContent, setEditorContent] = useState('');
  const [parseError, setParseError] = useState('');
  const [isEditorDirty, setIsEditorDirty] = useState(false);
  const [viewMode, setViewMode] = useState('spec');
  const [testCases, setTestCases] = useState([]);
  const [testCasesTotal, setTestCasesTotal] = useState(0);
  const [testCasesOffset, setTestCasesOffset] = useState(0);
  const [testCasesLoading, setTestCasesLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [noChangesDetected, setNoChangesDetected] = useState(false);

  // Generator settings
  const [genOpts, setGenOpts] = useState({
    includeNegativeTests: true,
    includeSecurityTests: true,
    includePerformanceTests: true,
    includeBoundaryTests: true,
    responseTimeThresholdMs: 5000,
  });
  const [genFormat, setGenFormat] = useState('');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSpecName, setNewSpecName] = useState('');
  const [createMode, setCreateMode] = useState('upload');
  const [selectedLibrarySpec, setSelectedLibrarySpec] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [importUrl, setImportUrl] = useState('');
  const fileInputRef = useRef(null);
  const [libraryItems, setLibraryItems] = useState([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingSpecId, setEditingSpecId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [isDark, setIsDark] = useState(true);
  const mainEd = useProbestackEditor(isDark);

  // Archive state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteAnchorRect, setDeleteAnchorRect] = useState(null);
  const [archiveBusy, setArchiveBusy] = useState(false);
  const [archivePollKey, setArchivePollKey] = useState(0);
  const [showArchive, setShowArchive] = useState(false);
  const [archiveVisible, setArchiveVisible] = useState(false); // drives the slide transform

  const openArchive = () => {
    setActiveSpecId(null);      // deselect the spec so no editor shows behind
    setShowArchive(true);
    // Next frame → flip visible=true so the initial translate-y-full → 0 transition runs.
    requestAnimationFrame(() => setArchiveVisible(true));
  };
  const closeArchive = () => {
    setArchiveVisible(false);
    // Wait for the slide-down animation to finish before unmounting.
    setTimeout(() => setShowArchive(false), 280);
  };

  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(() => {
      setIsDark(root.getAttribute('data-theme') !== 'light');
    });
    observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    setIsDark(root.getAttribute('data-theme') !== 'light');
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!activeWorkspaceId) return;
    fetchSpecs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkspaceId]);

  const fetchSpecs = async () => {
    setLoading(true);
    try {
      const res = await listTestSpecs(activeWorkspaceId, { limit: 100 });
      setSpecs(res.items);
      if (!activeSpecId && res.items.length > 0) setActiveSpecId(res.items[0].id);
      else if (res.items.length === 0) setActiveSpecId(null);
    } catch {
      toast.error('Failed to load test specs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setViewMode('spec');
    setTestCases([]);
    setTestCasesTotal(0);
    setTestCasesOffset(0);
    setNoChangesDetected(false);
  }, [activeSpecId]);

  useEffect(() => {
    if (viewMode === 'testcases' && activeSpecId) {
      handleLoadTestCases(activeSpecId, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, activeSpecId]);

  useEffect(() => {
    if (showCreateModal && createMode === 'library') fetchLibraryItems();
  }, [showCreateModal, createMode]);

  const fetchLibraryItems = async () => {
    setLoadingLibrary(true);
    try {
      const items = await listLibraryItems();
      setLibraryItems(items);
    } catch {
      toast.error('Failed to load library');
    } finally {
      setLoadingLibrary(false);
    }
  };

  const activeSpec = useMemo(() => specs.find(s => s.id === activeSpecId) || null, [specs, activeSpecId]);

  useEffect(() => {
    const spec = specs.find(s => s.id === activeSpecId);
    if (spec && !spec.content) {
      getTestSpec(activeSpecId)
        .then(fullSpec => setSpecs(prev => prev.map(s => s.id === activeSpecId ? fullSpec : s)))
        .catch(() => toast.error('Failed to load test spec content'));
    }
  }, [activeSpecId, specs]);

  useEffect(() => {
    setEditorContent(activeSpec ? activeSpec.content || '' : JSON.stringify(BLANK_SPEC_TEMPLATE, null, 2));
    setIsEditorDirty(false);
  }, [activeSpec]);

  useEffect(() => {
    try { JSON.parse(editorContent); setParseError(''); }
    catch (e) { setParseError(e.message); }
  }, [editorContent]);

  const filteredSpecs = useMemo(() => {
    if (!searchQuery.trim()) return specs;
    return specs.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [specs, searchQuery]);

  const runGenerate = async ({ force = false } = {}) => {
    if (!activeSpecId || generating) return;
    setGenerating(true);
    try {
      const res = await generateTestCases(activeSpecId, {
        force,
        ...genOpts,
        format: genFormat || undefined,
      });
      setNoChangesDetected(false);
      setTestCases(res.testCases);
      setTestCasesTotal(res.testCases.length);
      setTestCasesOffset(0);
      setViewMode('testcases');
      const deletedMsg = res.deleted > 0 ? `, cleared ${res.deleted} old case${res.deleted !== 1 ? 's' : ''}` : '';
      toast.success(`Generated ${res.generated} test case${res.generated !== 1 ? 's' : ''}${deletedMsg}`);
    } catch (err) {
      if (isUnchangedContentError(err)) {
        // The backend refused because the spec body hasn't changed since the
        // last generation. Show the previously-generated cases and surface the
        // "Regenerate anyway" UX.
        setNoChangesDetected(true);
        toast.info('Spec unchanged since last generation — showing the previous test cases.');
        await handleLoadTestCases(activeSpecId, 0);
        setViewMode('testcases');
      } else {
        toast.error('Generation failed: ' + (err.response?.data?.message || err.message));
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateTestCases = () => runGenerate({ force: false });
  const handleForceRegenerate = () => runGenerate({ force: true });

  const handleLoadTestCases = async (specId, offset) => {
    setTestCasesLoading(true);
    try {
      const res = await listTestCases(specId, { limit: TEST_CASES_LIMIT, offset });
      setTestCases(res.items);
      setTestCasesTotal(res.total);
      setTestCasesOffset(offset);
    } catch {
      toast.error('Failed to load test cases');
    } finally {
      setTestCasesLoading(false);
    }
  };

  const handleSelectSpec = (spec) => {
    if (showArchive) closeArchive();
    setActiveSpecId(spec.id);
  };

  const handleDeleteSpec = (e, spec) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setDeleteAnchorRect(rect);
    setDeleteTarget(spec);
  };

  const handleConfirmArchive = async (retentionDays) => {
    if (!deleteTarget) return;
    setArchiveBusy(true);
    try {
      await deleteTestSpec(deleteTarget.id, retentionDays);
      const removedId = deleteTarget.id;
      setSpecs(prev => prev.filter(s => s.id !== removedId));
      if (activeSpecId === removedId) {
        const remaining = specs.filter(s => s.id !== removedId);
        setActiveSpecId(remaining.length > 0 ? remaining[0].id : null);
      }
      toast.success(`Archived — auto-purge in ${retentionDays} day${retentionDays !== 1 ? 's' : ''}`);
      setDeleteTarget(null);
      setArchivePollKey(k => k + 1);
    } catch (err) {
      toast.error('Archive failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setArchiveBusy(false);
    }
  };

  const handleConfirmPermanentDelete = async () => {
    if (!deleteTarget) return;
    setArchiveBusy(true);
    try {
      await permanentDeleteTestSpec(deleteTarget.id);
      const removedId = deleteTarget.id;
      setSpecs(prev => prev.filter(s => s.id !== removedId));
      if (activeSpecId === removedId) {
        const remaining = specs.filter(s => s.id !== removedId);
        setActiveSpecId(remaining.length > 0 ? remaining[0].id : null);
      }
      toast.success('Permanently deleted');
      setDeleteTarget(null);
      setArchivePollKey(k => k + 1);
    } catch (err) {
      toast.error('Delete failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setArchiveBusy(false);
    }
  };

  const handleRestoreFromArchive = async (id) => {
    const restored = await restoreTestSpec(id);
    setSpecs(prev => {
      if (prev.find(s => s.id === restored.id)) return prev;
      return [restored, ...prev];
    });
  };

  const handlePermanentDeleteFromArchive = async (id) => {
    await permanentDeleteTestSpec(id);
  };

  const handleStartRename = (e, spec) => {
    e.stopPropagation();
    setEditingSpecId(spec.id);
    setEditingName(spec.name);
  };

  const handleConfirmRename = async (e, spec) => {
    if (e.key === 'Enter') {
      if (editingName.trim() && editingName !== spec.name) {
        try {
          const updated = await updateTestSpec(spec.id, { name: editingName.trim() });
          setSpecs(prev => prev.map(s => s.id === spec.id ? updated : s));
          toast.success('Renamed');
        } catch { toast.error('Rename failed'); }
      }
      setEditingSpecId(null); setEditingName('');
    } else if (e.key === 'Escape') {
      setEditingSpecId(null); setEditingName('');
    }
  };

  const handleRenameBlur = async (spec) => {
    if (editingName.trim() && editingName !== spec.name) {
      try {
        const updated = await updateTestSpec(spec.id, { name: editingName.trim() });
        setSpecs(prev => prev.map(s => s.id === spec.id ? updated : s));
      } catch { toast.error('Rename failed'); }
    }
    setEditingSpecId(null); setEditingName('');
  };

  const handleCreateNewSpec = () => {
    setNewSpecName(''); setCreateMode('upload'); setUploadedFile(null);
    setSelectedLibrarySpec(null); setImportUrl(''); setShowCreateModal(true);
  };

  const handleSaveContent = async () => {
    if (!activeSpecId || !editorContent || parseError) return;
    try {
      const updated = await updateTestSpec(activeSpecId, { content: editorContent });
      setSpecs(prev => prev.map(s => s.id === activeSpecId ? updated : s));
      setIsEditorDirty(false);
      setNoChangesDetected(false);
      toast.success('Saved');
    } catch { toast.error('Save failed'); }
  };

  const handleDownload = () => {
    if (!activeSpec) return;
    const blob = new Blob([editorContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${activeSpec.name}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveNewSpec = async () => {
    if (!newSpecName.trim()) { toast.error('Please enter a spec name'); return; }
    if (!activeWorkspaceId) { toast.error('No project selected'); return; }

    let payload;

    if (createMode === 'upload') {
      if (!uploadedFile) { toast.error('Please select a file'); return; }
      let content;
      try {
        const text = await uploadedFile.text();
        JSON.parse(text);
        content = text;
      } catch { toast.error('Invalid JSON file'); return; }
      payload = { source: 'upload', name: newSpecName.trim(), content, workspaceId: activeWorkspaceId };

    } else if (createMode === 'url') {
      if (!importUrl.trim()) { toast.error('Please enter a URL'); return; }
      payload = { source: 'url', name: newSpecName.trim(), importUrl: importUrl.trim(), workspaceId: activeWorkspaceId };

    } else if (createMode === 'library') {
      if (!selectedLibrarySpec) { toast.error('Please select a library spec'); return; }
      payload = { source: 'library', name: newSpecName.trim(), sourceId: selectedLibrarySpec, workspaceId: activeWorkspaceId };

    } else {
      payload = { source: 'upload', name: newSpecName.trim(),
                  content: JSON.stringify(BLANK_SPEC_TEMPLATE, null, 2), workspaceId: activeWorkspaceId };
    }

    try {
      const created = await createTestSpec(payload);
      setSpecs(prev => [created, ...prev]);
      setActiveSpecId(created.id);
      setShowCreateModal(false);
      toast.success('Test spec created');
    } catch (err) {
      toast.error('Creation failed: ' + (err.response?.data?.message || err.message));
    }
  };

  const fetchArchived = async () => {
    if (!activeWorkspaceId) return [];
    const res = await listArchivedTestSpecs(activeWorkspaceId, { limit: 100 });
    return res.items;
  };

  // Creator can always act. Otherwise allow if the archived item's workspace
  // is one of the current user's accessible projects (workspace membership).
  const workspaceIds = useMemo(
    () => new Set((projects || []).map(p => p.id)),
    [projects],
  );
  const canActOnArchived = (item) =>
    (!item.createdBy || !currentUserId || item.createdBy === currentUserId) ||
    (item.workspaceId && workspaceIds.has(item.workspaceId));

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-[var(--color-input-bg)]">
      {/* Page header */}
      <div className="px-6 py-4 border-b border-dark-700 bg-[var(--color-card-bg)] flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Generate Test Cases</h2>
          <p className="text-sm text-[var(--color-text-secondary)]">Create and manage JSON test case specifications</p>
        </div>
        <div className="flex items-center gap-2">
          <ArchiveViewTrigger
            active={showArchive}
            onToggle={() => (showArchive ? closeArchive() : openArchive())}
            fetchArchived={fetchArchived}
            pollKey={archivePollKey}
            label="Archive"
          />
          <button
            onClick={handleCreateNewSpec}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600
                       text-white font-medium text-sm hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg shadow-orange-500/25"
            data-testid="spec-create-btn"
          >
            <Plus className="h-4 w-4" /> Create Test Case
          </button>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Spec sidebar */}
        <aside className="w-72 border-r border-dark-700 bg-[var(--color-card-bg)] flex flex-col">
          <div className="px-4 py-2 border-b border-dark-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                type="text" placeholder="Search specs..." value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[var(--color-input-bg)] border border-dark-700 rounded-lg pl-10 pr-3 py-2 text-sm
                           text-[var(--color-text-primary)] placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                data-testid="spec-search"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {loading ? (
              <div className="text-center py-8 text-gray-500 text-sm">Loading...</div>
            ) : filteredSpecs.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm whitespace-pre-line">
                {searchQuery ? 'No specs match your search' : 'No test specs yet.\nCreate one to get started.'}
              </div>
            ) : (
              filteredSpecs.map(spec => (
                <div
                  key={spec.id}
                  onClick={() => handleSelectSpec(spec)}
                  className={clsx(
                    'group flex items-center gap-2 p-2.5 rounded-lg cursor-pointer transition-all',
                    activeSpecId === spec.id
                      ? 'bg-primary/10 border border-primary/30'
                      : 'hover:bg-[var(--color-card-bg)]/80 border border-transparent'
                  )}
                  data-testid={`spec-item-${spec.id}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <FileCode className="h-4 w-4 text-primary flex-shrink-0" />
                      {editingSpecId === spec.id ? (
                        <input
                          type="text" value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => handleConfirmRename(e, spec)}
                          onBlur={() => handleRenameBlur(spec)}
                          autoFocus
                          className="flex-1 bg-[var(--color-input-bg)] border border-primary/50 rounded px-2 py-0.5 text-sm text-[var(--color-text-primary)]
                                     focus:outline-none focus:ring-1 focus:ring-primary"
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <span className="text-sm font-medium text-[var(--color-text-primary)] truncate">{spec.name}</span>
                      )}
                    </div>
                    {spec.source && (
                      <div className="mt-0.5 ml-6">
                        <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] rounded ${getSourceDisplay(spec.source).color}`}>
                          {getSourceDisplay(spec.source).label}
                        </span>
                      </div>
                    )}
                  </div>

                  {editingSpecId !== spec.id && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => handleStartRename(e, spec)}
                        className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-dark-600" title="Rename"
                        data-testid={`spec-rename-${spec.id}`}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={(e) => handleDeleteSpec(e, spec)}
                        className="p-1.5 rounded-md text-gray-400 hover:text-red-400 hover:bg-red-500/10" title="Delete…"
                        data-testid={`spec-delete-${spec.id}`}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Main area */}
        {/* Main area — editor/test-cases view is always mounted. Archive view
            overlays it with a slide-up animation from the bottom. */}
        <div className="flex-1 relative flex flex-col min-h-0">
          <main className="flex-1 flex flex-col min-h-0 bg-[var(--color-card-bg)]">
          {/* Toolbar */}
          <div className="px-4 py-3 border-b border-dark-700 flex items-center justify-between bg-[var(--color-card-bg)]/20 gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                {activeSpec ? activeSpec.name : 'New Test Case'}
              </span>

              {activeSpec && (
                <div className="flex items-center rounded-lg border border-dark-600 overflow-hidden text-xs shrink-0">
                  <button
                    onClick={() => setViewMode('spec')}
                    className={clsx('px-3 py-1.5 transition-colors', viewMode === 'spec'
                      ? 'bg-primary text-white'
                      : 'text-gray-400 hover:text-white hover:bg-dark-700')}
                  >
                    Spec
                  </button>
                  <button
                    onClick={() => setViewMode('testcases')}
                    className={clsx('px-3 py-1.5 transition-colors', viewMode === 'testcases'
                      ? 'bg-primary text-white'
                      : 'text-gray-400 hover:text-white hover:bg-dark-700')}
                  >
                    Test Cases
                    {testCasesTotal > 0 && (
                      <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-white/10 text-xs">
                        {testCasesTotal}
                      </span>
                    )}
                  </button>
                </div>
              )}

              {viewMode === 'spec' && (
                <>
                  <span className="text-xs px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">JSON</span>
                  {parseError && (
                    <span className="text-xs px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400" /> Invalid JSON
                    </span>
                  )}
                </>
              )}
            </div>

            {activeSpec && (
              <div className="flex items-center gap-2 shrink-0">
                <GeneratorSettingsPopover
                  format={genFormat}
                  setFormat={setGenFormat}
                  opts={genOpts}
                  setOpts={setGenOpts}
                />

                <button
                  onClick={handleGenerateTestCases}
                  disabled={generating}
                  title={noChangesDetected
                    ? 'The spec hasn\'t changed since the last generation — use Regenerate anyway'
                    : 'Generate test cases'}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600
                             text-white font-medium text-xs hover:from-orange-600 hover:to-orange-700 transition-all
                             shadow shadow-orange-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
                  data-testid="generate-btn"
                >
                  <Zap className={clsx('h-3.5 w-3.5', generating && 'animate-spin')} />
                  {generating ? 'Generating…' : 'Generate'}
                </button>

                {noChangesDetected && (
                  <button
                    onClick={handleForceRegenerate}
                    disabled={generating}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600
                               text-white font-medium text-xs transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    title="Regenerate even though the spec is unchanged"
                    data-testid="force-regenerate-btn"
                  >
                    <RefreshCw className={clsx('h-3.5 w-3.5', generating && 'animate-spin')} />
                    Regenerate anyway
                  </button>
                )}

                {viewMode === 'spec' && isEditorDirty && (
                  <button onClick={handleSaveContent}
                    className="p-2 rounded-lg text-white bg-primary hover:bg-primary/90 transition-colors" title="Save changes">
                    <Save className="h-4 w-4" />
                  </button>
                )}
                {viewMode === 'spec' && (
                  <button onClick={handleDownload}
                    className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-dark-700 transition-colors" title="Download JSON">
                    <Download className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Content */}
          {viewMode === 'spec' ? (
            <div className="flex-1 flex flex-col min-h-0">
              <div ref={mainEd.wrapperRef} className={clsx('flex-1 min-h-0', isDark && 'bg-probestack-bg')}>
                <Editor
                  value={editorContent} language="json" theme={isDark ? 'probestack-dark' : 'light'}
                  onMount={mainEd.onMount}
                  options={getMonacoOptions(isDark)}
                  onChange={(v) => {
                    setEditorContent(v || '');
                    setIsEditorDirty(true);
                    setNoChangesDetected(false);
                  }}
                  height="100%"
                />
              </div>
              {parseError && (
                <div className="px-4 py-3 bg-red-500/10 border-t border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                  <span>⚠️</span> <span>JSON Error: {parseError}</span>
                </div>
              )}
            </div>
          ) : (
            <TestCasesView
              testCases={testCases}
              total={testCasesTotal}
              offset={testCasesOffset}
              loading={testCasesLoading}
              generating={generating}
              noChangesDetected={noChangesDetected}
              onGenerate={handleGenerateTestCases}
              onForceRegenerate={handleForceRegenerate}
              onPageChange={(newOffset) => handleLoadTestCases(activeSpecId, newOffset)}
            />
          )}
        </main>

        {/* Archive slide-up panel (mounts over the editor, animated) */}
        {showArchive && (
          <div
            className="absolute inset-0 z-20 flex flex-col transition-transform duration-[280ms] ease-out will-change-transform shadow-xl"
            style={{ transform: archiveVisible ? 'translateY(0%)' : 'translateY(100%)' }}
            data-testid="archive-slide-panel"
          >
            <ArchivedItemsView
              title="Archived Test Specs"
              onClose={closeArchive}
              fetchArchived={fetchArchived}
              onRestore={handleRestoreFromArchive}
              onPermanentDelete={handlePermanentDeleteFromArchive}
              canAct={canActOnArchived}
              refreshKey={archivePollKey}
            />
          </div>
        )}
        </div>
      </div>

      {/* Unified delete / archive popover (anchored, no full-screen blur) */}
      <DeleteWithRetentionModal
        open={!!deleteTarget}
        anchorRect={deleteAnchorRect}
        itemName={deleteTarget?.name}
        itemType="Test Spec"
        onCancel={() => { if (!archiveBusy) { setDeleteTarget(null); setDeleteAnchorRect(null); } }}
        onArchive={handleConfirmArchive}
        onDelete={handleConfirmPermanentDelete}
        busy={archiveBusy}
      />

      {/* Create modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
          <div className="relative bg-[var(--color-input-bg)] border border-dark-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-dark-700 flex items-center justify-between bg-[var(--color-card-bg)]/50">
              <div>
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Create New Test Case</h3>
                <p className="text-sm text-[var(--color-text-secondary)]">Create a test case using various methods</p>
              </div>
              <button onClick={() => setShowCreateModal(false)}
                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-dark-700 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto max-h-[60vh]">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                  Test Case Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text" value={newSpecName} onChange={(e) => setNewSpecName(e.target.value)}
                  placeholder="Enter test case name"
                  className="w-full bg-[var(--color-input-bg)] border border-dark-700 rounded-lg px-3 py-2.5 text-sm
                             text-[var(--color-text-primary)] placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-3">Creation Method</label>
                <div className="space-y-3">
                  <label className={`flex items-start p-4 border rounded-lg cursor-pointer transition-all ${
                    createMode === 'upload' ? 'border-primary bg-primary/5' : 'border-dark-700 hover:border-primary/50'}`}>
                    <input type="radio" name="createMode" value="upload" checked={createMode === 'upload'}
                      onChange={(e) => setCreateMode(e.target.value)} className="mt-1 mr-3 text-primary" />
                    <div className="flex-1">
                      <div className="font-medium text-[var(--color-text-primary)]">Upload JSON Spec</div>
                      <div className="text-sm text-[var(--color-text-secondary)] mt-1">
                        Upload an OpenAPI JSON or Postman Collection v2/v2.1 file
                      </div>
                      {createMode === 'upload' && (
                        <div className="mt-3">
                          <input type="file" accept=".json" ref={fileInputRef}
                            onChange={(e) => e.target.files?.[0] && setUploadedFile(e.target.files[0])}
                            className="hidden" />
                          <button type="button" onClick={() => fileInputRef.current?.click()}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-dark-600 bg-[var(--color-card-bg)]
                                       text-[var(--color-text-primary)] hover:bg-dark-600 hover:text-white transition-colors text-sm">
                            <Upload className="h-4 w-4" />
                            {uploadedFile ? `Selected: ${uploadedFile.name}` : 'Choose JSON File'}
                          </button>
                        </div>
                      )}
                    </div>
                  </label>

                  <label className={`flex items-start p-4 border rounded-lg cursor-pointer transition-all ${
                    createMode === 'library' ? 'border-primary bg-primary/5' : 'border-dark-700 hover:border-primary/50'}`}>
                    <input type="radio" name="createMode" value="library" checked={createMode === 'library'}
                      onChange={(e) => setCreateMode(e.target.value)} className="mt-1 mr-3 text-primary" />
                    <div className="flex-1">
                      <div className="font-medium text-[var(--color-text-primary)]">Create from organization Specification Library</div>
                      <div className="text-sm text-[var(--color-text-secondary)] mt-1">Browse and select from the specification library</div>
                      {createMode === 'library' && (
                        <div className="mt-4 space-y-2 max-h-60 overflow-y-auto">
                          {loadingLibrary ? (
                            <div className="text-center py-4 text-gray-500">Loading library...</div>
                          ) : libraryItems.length === 0 ? (
                            <div className="text-center py-4 text-gray-500">No library items found</div>
                          ) : (
                            libraryItems.map((item) => (
                              <div key={item.id} onClick={() => setSelectedLibrarySpec(item.id)}
                                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                                  selectedLibrarySpec === item.id
                                    ? 'border-primary bg-primary/10'
                                    : 'border-dark-600 hover:border-primary/50 hover:bg-[var(--color-card-bg)]/50'}`}>
                                <div className="flex items-start gap-3">
                                  <div className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center ${
                                    selectedLibrarySpec === item.id ? 'border-primary bg-primary' : 'border-dark-500'}`}>
                                    {selectedLibrarySpec === item.id && <Check className="w-3 h-3 text-white" />}
                                  </div>
                                  <div className="flex-1">
                                    <div className="font-medium text-[var(--color-text-primary)] text-sm">{item.name}</div>
                                    {item.description && <div className="text-xs text-[var(--color-text-secondary)] mt-0.5">{item.description}</div>}
                                    {item.category && (
                                      <div className="mt-1">
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-dark-600 text-gray-400">{item.category}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </label>

                  <label className={`flex items-start p-4 border rounded-lg cursor-pointer transition-all ${
                    createMode === 'url' ? 'border-primary bg-primary/5' : 'border-dark-700 hover:border-primary/50'}`}>
                    <input type="radio" name="createMode" value="url" checked={createMode === 'url'}
                      onChange={(e) => setCreateMode(e.target.value)} className="mt-1 mr-3 text-primary" />
                    <div className="flex-1">
                      <div className="font-medium text-[var(--color-text-primary)]">Import from URL</div>
                      <div className="text-sm text-[var(--color-text-secondary)] mt-1">Fetch and import a JSON specification from a URL</div>
                      {createMode === 'url' && (
                        <div className="mt-3">
                          <input type="text" value={importUrl} onChange={(e) => setImportUrl(e.target.value)}
                            placeholder="https://example.com/api-spec.json"
                            className="w-full bg-[var(--color-input-bg)] border border-dark-700 rounded-lg px-3 py-2 text-sm
                                       text-[var(--color-text-primary)] placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                          />
                        </div>
                      )}
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-dark-700 bg-[var(--color-card-bg)] flex justify-end gap-3">
              <button onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-lg border border-dark-600 text-gray-300 hover:bg-dark-700 hover:text-white transition-colors text-sm font-medium">
                Cancel
              </button>
              <button
                onClick={handleSaveNewSpec}
                disabled={
                  !newSpecName.trim() || !activeWorkspaceId ||
                  (createMode === 'upload' && !uploadedFile) ||
                  (createMode === 'url' && !importUrl.trim()) ||
                  (createMode === 'library' && !selectedLibrarySpec)
                }
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 text-white font-medium text-sm
                           hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg shadow-orange-500/25
                           disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
              >
                Create Test Case
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
