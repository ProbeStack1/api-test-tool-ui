// src/components/landingPage/StartTestingModal.jsx
//
// Bottom-right floating "sync panel" (replaces the old centered dialog).
// - No full-screen dark backdrop. Click-outside still closes via a
//   transparent capture layer so we don't trap the user.
// - Slides in from the bottom-right with a subtle glass blur + orange
//   glow border to match the landing aesthetic.
// - Prefills the email, auto-focuses + select-alls it so the user can
//   hit Enter instantly.
// - Esc closes. Enter submits. Disabled while bootstrap is in-flight.

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Zap, Mail, X, Loader2, ArrowRight } from 'lucide-react';

export default function StartTestingModal({
  open,
  initialEmail = 'admin@forgecrux.com',
  onSubmit,     // async (email) => void — throw to stay open
  onClose,
}) {
  const effectiveInitial = initialEmail && initialEmail.trim()
    ? initialEmail
    : 'admin@forgecrux.com';

  const [email, setEmail]       = useState(effectiveInitial);
  const [submitting, setSubmit] = useState(false);
  const [error, setError]       = useState(null);
  const inputRef                = useRef(null);

  useEffect(() => {
    if (open) { setEmail(effectiveInitial); setError(null); }
  }, [open, effectiveInitial]);

  useEffect(() => {
    if (!open) return;
    setTimeout(() => { inputRef.current?.focus(); inputRef.current?.select(); }, 80);
    const onKey = (e) => {
      if (e.key === 'Escape' && !submitting) onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, submitting, onClose]);

  if (!open) return null;

  const valid = /^\S+@\S+\.\S+$/.test(email.trim());

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!valid || submitting) return;
    setError(null);
    setSubmit(true);
    try { await onSubmit?.(email.trim()); }
    catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Could not sync account. Try again.');
    } finally { setSubmit(false); }
  };

  return createPortal(
    <>
      {/* Transparent click-outside catcher (no dark overlay, no global blur) */}
      <div
        className="fixed inset-0 z-[9998]"
        onMouseDown={() => !submitting && onClose?.()}
        style={{ background: 'transparent' }}
      />

      {/* Floating panel — bottom right */}
      <div
        data-testid="start-testing-modal"
        role="dialog"
        aria-modal="true"
        className="fixed z-[9999] bottom-6 right-6 w-[min(400px,calc(100vw-32px))]
                   animate-in slide-in-from-bottom-4 fade-in duration-200"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Glow ring */}
        <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-br from-[#ff5b1f]/60 via-[#ff5b1f]/10 to-transparent blur-[2px] opacity-80 pointer-events-none" />

        {/* Card */}
        <div className="relative rounded-2xl border border-white/10
                        bg-[#0b0f17]/85 backdrop-blur-xl
                        shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7),0_0_40px_-10px_rgba(255,91,31,0.25)]
                        overflow-hidden">

          {/* Accent top strip */}
          <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#ff5b1f] to-transparent" />

          <div className="p-5">
            {/* Close */}
            <button
              type="button"
              onClick={() => !submitting && onClose?.()}
              disabled={submitting}
              className="absolute top-3 right-3 p-1.5 rounded-md text-gray-500
                         hover:text-white hover:bg-white/5 transition-colors
                         disabled:opacity-40"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="relative w-9 h-9 rounded-xl bg-[#ff5b1f]/15 flex items-center justify-center ring-1 ring-[#ff5b1f]/30">
                <Zap className="w-[18px] h-[18px] text-[#ff5b1f]" />
                <div className="absolute inset-0 rounded-xl bg-[#ff5b1f]/10 blur-md -z-10" />
              </div>
              <div className="flex flex-col">
                <h3 className="text-[15px] font-semibold text-white leading-tight">
                  Continue to Workspace
                </h3>
                <span className="text-[11px] text-[#ff5b1f]/90 font-medium tracking-wide uppercase">
                  ForgeCrux · Secure Sync
                </span>
              </div>
            </div>

            <p className="text-[12.5px] text-gray-400 mb-4 leading-relaxed">
              Confirm your ForgeCrux email. We'll sync your account and drop
              you into the testing workspace.
            </p>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3">
              <label className="block">
                <span className="text-[10px] uppercase tracking-[0.12em] text-gray-500 font-semibold">
                  Email
                </span>
                <div className="mt-1.5 relative group">
                  <Mail className="w-4 h-4 text-gray-500 group-focus-within:text-[#ff5b1f] transition-colors absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    ref={inputRef}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={submitting}
                    placeholder="name@forgecrux.com"
                    autoComplete="email"
                    data-testid="start-testing-email-input"
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg
                               bg-[#0f1420]/80 border border-white/10
                               text-[13px] text-white placeholder:text-gray-600
                               focus:outline-none focus:ring-2 focus:ring-[#ff5b1f]/40
                               focus:border-[#ff5b1f]/50 transition-colors
                               disabled:opacity-50"
                  />
                </div>
              </label>

              {error && (
                <div className="text-[11.5px] text-red-300 bg-red-500/10 border border-red-500/30 rounded-md px-3 py-2">
                  {error}
                </div>
              )}

              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="text-[10.5px] text-gray-600">
                  Press <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-gray-400 text-[10px] font-mono">Enter</kbd> to continue
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => !submitting && onClose?.()}
                    disabled={submitting}
                    className="px-3 py-1.5 rounded-lg text-[12.5px] text-gray-400
                               hover:text-white hover:bg-white/5 transition-colors
                               disabled:opacity-40"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!valid || submitting}
                    data-testid="start-testing-submit-btn"
                    className="group inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg
                               bg-[#ff5b1f] hover:bg-[#ff6a30]
                               text-[12.5px] font-semibold text-white
                               shadow-lg shadow-[#ff5b1f]/25
                               transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {submitting
                      ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Syncing…</>
                      : <>Continue <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" /></>
                    }
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
