// src/components/mcp/shared/ResultPanel.jsx
//
// Beautified, slide-in panel for MCP inspect responses. Wraps the raw
// envelope returned by the backend and surfaces the human-relevant bits
// (status, latency, session id, extracted content) at the top, while keeping
// advanced data (trace steps, response headers, raw envelope) in collapsible
// rows that expand on click.

import React, { useMemo, useState } from 'react';
import clsx from 'clsx';
import {
  Check, X, Clock, Fingerprint, Activity, ChevronDown, FileText, Braces, ListTree,
} from 'lucide-react';
import StatusBadge from './StatusBadge';
import JsonViewer from './JsonViewer';

/**
 * @param {Object} props
 * @param {boolean} props.ok              Whether the operation succeeded
 * @param {Object}  props.data            Unwrapped payload (may contain `content`, `messages`, `contents`, or bare fields)
 * @param {Object=} props.error           Error object when ok = false
 * @param {number=} props.ms              Measured latency in milliseconds
 * @param {string=} props.kind            'tool' | 'resource' | 'prompt' (affects headings)
 */
export default function ResultPanel({ ok, data, error, ms, kind = 'tool' }) {
  const meta = ok ? data : error || {};
  const latency   = ms ?? meta?._latencyMs ?? null;
  const status    = meta?._statusCode ?? (ok ? 200 : null);
  const sessionId = meta?._sessionId ?? null;
  const headers   = meta?._responseHeaders ?? null;
  const trace     = meta?._traceSteps ?? null;
  const errorMsg  = error?.message ?? meta?._errorMessage ?? null;

  // Extract the "headline" payload — what the end user actually cares about
  const headline = useMemo(() => extractHeadline(ok ? data : error, kind), [ok, data, error, kind]);

  // Raw (minus meta/underscore keys) for the deep-dive accordion
  const rawPayload = useMemo(() => stripMeta(ok ? data : error), [ok, data, error]);

  return (
    <div
      data-testid="mcp-result-panel"
      className="rounded-xl border border-dark-700/60 bg-dark-800/60 overflow-hidden shadow-[0_10px_40px_-20px_rgba(0,0,0,0.6)] animate-[slideUp_260ms_cubic-bezier(0.22,1,0.36,1)]"
    >
      {/* Header strip */}
      <div className={clsx(
        'flex items-center justify-between gap-3 px-4 py-2.5 border-b border-dark-700/60',
        ok ? 'bg-gradient-to-r from-emerald-500/10 via-dark-800 to-dark-800'
           : 'bg-gradient-to-r from-red-500/15 via-dark-800 to-dark-800'
      )}>
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className={clsx(
            'inline-flex items-center justify-center w-5 h-5 rounded-full',
            ok ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
          )}>
            {ok ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
          </span>
          <span className="text-xs font-semibold text-white">
            {ok ? 'Success' : 'Error'}
          </span>
          {status != null && (
            <span className={clsx(
              'text-xs px-1.5 py-0.5 rounded font-mono border',
              status >= 200 && status < 300 ? 'border-emerald-400/30 text-emerald-300 bg-emerald-400/10'
              : status >= 400 ? 'border-red-400/30 text-red-300 bg-red-400/10'
              : 'border-amber-400/30 text-amber-300 bg-amber-400/10'
            )}>HTTP {status}</span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-400 shrink-0 flex-wrap justify-end">
          {latency != null && (
            <span className="inline-flex items-center gap-1 font-mono" title="Latency">
              <Clock className="w-3 h-3 text-primary" />{latency}ms
            </span>
          )}
          {sessionId && (
            <span className="inline-flex items-center gap-1 font-mono truncate max-w-[200px]" title={`Session ${sessionId}`}>
              <Fingerprint className="w-3 h-3 text-primary" />{sessionId}
            </span>
          )}
        </div>
      </div>

      {/* Error banner */}
      {!ok && errorMsg && (
        <div className="px-4 py-2.5 bg-red-500/10 border-b border-red-500/20 text-xs text-red-300 font-mono">
          {errorMsg}
        </div>
      )}

      {/* Headline content (pretty) */}
      <div className="p-4 space-y-3">
        {headline.pretty && (
          <Section icon={FileText} title={headline.title}>
            <pre className="text-sm font-mono text-gray-100 whitespace-pre-wrap leading-relaxed bg-probestack-bg border border-dark-700/60 rounded-lg p-3 max-h-80 overflow-auto custom-scrollbar">
              {headline.pretty}
            </pre>
          </Section>
        )}
        {headline.json && (
          <Section icon={Braces} title={headline.jsonTitle || 'Payload'}>
            <JsonViewer data={headline.json} title={headline.jsonTitle || 'payload'} maxHeight={360} expandDefault />
          </Section>
        )}
      </div>

      {/* Collapsible technical details */}
      <Accordion icon={ListTree} title={`Trace steps (${trace?.length || 0})`} disabled={!trace || trace.length === 0}>
        <ol className="space-y-1.5">
          {(trace || []).map((t, i) => {
            const dur = (t.ended_at && t.started_at) ? t.ended_at - t.started_at : null;
            return (
              <li key={i} className="flex items-center gap-2 text-xs font-mono">
                <span className={clsx(
                  'inline-flex items-center justify-center w-4 h-4 rounded',
                  t.ok ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                )}>
                  {t.ok ? <Check className="w-2.5 h-2.5" /> : <X className="w-2.5 h-2.5" />}
                </span>
                <span className="text-gray-200">{t.name}</span>
                {dur != null && <span className="text-gray-500">· {dur}ms</span>}
                {t.detail && <span className="text-gray-500 truncate">· {t.detail}</span>}
              </li>
            );
          })}
        </ol>
      </Accordion>

      <Accordion icon={Activity} title={`Response headers (${headers ? Object.keys(headers).length : 0})`} disabled={!headers || Object.keys(headers || {}).length === 0}>
        <div className="rounded-md border border-dark-700/60 bg-dark-900/40 overflow-hidden">
          <table className="w-full text-xs font-mono">
            <tbody>
              {Object.entries(headers || {}).map(([k, v]) => (
                <tr key={k} className="border-b border-dark-700/40 last:border-b-0">
                  <td className="px-3 py-1.5 text-gray-400 whitespace-nowrap align-top">{k}</td>
                  <td className="px-3 py-1.5 text-gray-200 break-all">{String(v)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Accordion>

      <Accordion icon={Braces} title="Raw payload (JSON)" disabled={!rawPayload || Object.keys(rawPayload).length === 0}>
        <JsonViewer data={rawPayload} title="raw" maxHeight={360} expandDefault />
      </Accordion>

      <style>{`
        @keyframes slideUp {
          0%   { opacity: 0; transform: translateY(14px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

/* ───────── Internals ───────── */

function Section({ icon: Icon, title, children }) {
  return (
    <section>
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon className="w-3 h-3 text-primary" />
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">{title}</span>
      </div>
      {children}
    </section>
  );
}

function Accordion({ icon: Icon, title, disabled, children }) {
  const [open, setOpen] = useState(false);
  if (disabled) return null;
  return (
    <div className="border-t border-dark-700/60">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-dark-700/30 transition-colors"
      >
        <ChevronDown className={clsx('w-3 h-3 text-gray-500 transition-transform', open && 'rotate-180')} />
        <Icon className="w-3 h-3 text-primary" />
        <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">{title}</span>
      </button>
      {open && <div className="px-4 pb-4 pt-1 animate-[fadeIn_200ms_ease-out]">{children}</div>}
      <style>{`@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>
    </div>
  );
}

/**
 * Extract the "user-facing" payload for each MCP response kind.
 *  - Tool call   → unwrap `content[].text` / show `structuredContent`
 *  - Resource    → unwrap `contents[].text` or `contents[].blob`
 *  - Prompt get  → join `messages[].content.text`
 *  Anything we can't beautify falls through to a JSON viewer.
 */
function extractHeadline(data, kind) {
  if (!data) return {};
  // Tool call
  if (kind === 'tool') {
    const content = Array.isArray(data?.content) ? data.content : null;
    if (content) {
      const text = content.filter(c => c.type === 'text' && typeof c.text === 'string').map(c => c.text).join('\n\n');
      return {
        title: data.isError ? 'Tool error' : 'Tool output',
        pretty: text || null,
        json: data.structuredContent ?? (text ? null : data),
        jsonTitle: 'structuredContent',
      };
    }
  }
  // Resource read
  if (kind === 'resource') {
    const contents = Array.isArray(data?.contents) ? data.contents : null;
    if (contents && contents.length) {
      const parts = contents.map(c => c.text ?? (c.blob ? '[binary blob, base64 redacted]' : JSON.stringify(c)));
      return {
        title: 'Resource content',
        pretty: parts.join('\n\n'),
        json: null,
      };
    }
  }
  // Prompt get
  if (kind === 'prompt') {
    const messages = Array.isArray(data?.messages) ? data.messages : null;
    if (messages && messages.length) {
      const rendered = messages.map(m => {
        const role  = (m.role || 'user').toUpperCase();
        const txt   = m?.content?.text ?? (typeof m?.content === 'string' ? m.content : JSON.stringify(m.content));
        return `▶ ${role}\n${txt}`;
      }).join('\n\n');
      return {
        title: `Rendered messages (${messages.length})`,
        pretty: rendered,
        json: data.description ? { description: data.description } : null,
        jsonTitle: 'metadata',
      };
    }
  }
  // Fallback
  const stripped = stripMeta(data);
  return {
    title: 'Payload',
    pretty: null,
    json: stripped,
    jsonTitle: 'payload',
  };
}

/** Drop underscore-prefixed meta keys added by unwrapInspect. */
function stripMeta(data) {
  if (!data || typeof data !== 'object') return data;
  const out = {};
  for (const [k, v] of Object.entries(data)) if (!k.startsWith('_')) out[k] = v;
  return out;
}
