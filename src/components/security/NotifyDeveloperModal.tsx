/**
 * NotifyDeveloperModal — composes and dispatches a security-finding
 * email through the shared `forgeq-functional-test-mgmt-svc` backend.
 *
 * Wired to: POST /api/v1/security/findings/notify
 *
 * Behaviour:
 *   • Pre-fills To/Subject/Body from the {@link ProbeResult}
 *   • To accepts comma-separated emails (basic validation)
 *   • CC supports the same shape, optional
 *   • Optional "Sender's note" field — flows into the email template
 *   • Submit button is disabled when To is empty or invalid
 *   • Loading state + success/error toast inline
 *
 * data-testid coverage:
 *   notify-modal-root, notify-modal-close, notify-modal-to,
 *   notify-modal-cc, notify-modal-note, notify-modal-send,
 *   notify-modal-status.
 */
import { useState } from 'react';
import axios from 'axios';
import { X, Send, Mail, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import type { ProbeResult } from '@/components/security/ProbeTransparencyCard';

/**
 * Backend endpoint base URL.
 * Functional-test svc owns the security notify endpoint (see
 * SecurityFindingsController.java). Env override lets us swap targets
 * in staging without rebuilds.
 */
const NOTIFY_URL =
  (import.meta.env.VITE_FUNCTIONAL_TEST_SVC_URL || 'http://localhost:8089') +
  '/api/v1/functional-tests/security/findings/notify';

interface Props {
  finding: ProbeResult;
  /** Endpoint URL that was scanned — used in subject + body. */
  scannedUrl: string;
  /** Optional default recipients (e.g. team's mailing list from settings). */
  defaultTo?: string[];
  appName?: string;
  onClose: () => void;
}

export function NotifyDeveloperModal({
  finding,
  scannedUrl,
  defaultTo = [],
  appName = 'ForgeFuzz',
  onClose,
}: Props) {
  const [to, setTo] = useState<string>(defaultTo.join(', '));
  const [cc, setCc] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  /** Split CSV → trimmed, non-empty, RFC-ish email shape. */
  const parseList = (raw: string): string[] =>
    raw.split(/[,;]/).map((s) => s.trim()).filter((s) => /.+@.+\..+/.test(s));

  const toList = parseList(to);
  const ccList = parseList(cc);

  const canSend = toList.length > 0 && !submitting;

  const handleSend = async () => {
    setSubmitting(true);
    setResult(null);
    try {
      const payload = {
        to: toList,
        cc: ccList.length > 0 ? ccList : undefined,
        findingTitle: finding.name,
        severity: finding.severity,
        endpoint: scannedUrl,
        detail: finding.detail,
        remediation: finding.remediation ?? '',
        evidence: finding.evidence ?? '',
        appName,
        customNote: note,
      };
      const { data } = await axios.post(NOTIFY_URL, payload);
      setResult({
        ok: true,
        message: `Sent via ${data.provider}. Recipients: ${data.recipients.join(', ')}`,
      });
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message ||
        'Failed to send. See backend logs.';
      setResult({ ok: false, message: msg });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      data-testid="notify-modal-root"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl border border-border bg-background-elevated shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border px-5 py-3">
          <Mail className="w-4 h-4 text-primary" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-foreground">Notify developer</div>
            <div className="text-xs text-text-muted truncate">{finding.name} · {finding.severity}</div>
          </div>
          <button
            data-testid="notify-modal-close"
            onClick={onClose}
            className="p-1 rounded hover:bg-muted/50"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-3 text-sm">
          {/* To */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-1">
              To <span className="text-red-500">*</span>
            </label>
            <input
              data-testid="notify-modal-to"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="dev@team.com, lead@team.com"
              className="w-full px-3 py-2 rounded bg-muted/30 border border-border focus:outline-none focus:border-primary text-sm font-mono"
            />
            <div className="mt-1 text-[10px] text-text-faint">
              {toList.length > 0
                ? `${toList.length} valid recipient${toList.length === 1 ? '' : 's'}`
                : 'Enter at least one email (comma-separated for multiple)'}
            </div>
          </div>

          {/* CC */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-1">
              CC <span className="text-text-faint">(optional)</span>
            </label>
            <input
              data-testid="notify-modal-cc"
              value={cc}
              onChange={(e) => setCc(e.target.value)}
              placeholder="security@team.com"
              className="w-full px-3 py-2 rounded bg-muted/30 border border-border focus:outline-none focus:border-primary text-sm font-mono"
            />
          </div>

          {/* Note */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-1">
              Sender's note <span className="text-text-faint">(appears in the email body)</span>
            </label>
            <textarea
              data-testid="notify-modal-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. please patch by EOW; reproducer attached in slack #security"
              rows={3}
              className="w-full px-3 py-2 rounded bg-muted/30 border border-border focus:outline-none focus:border-primary text-sm"
            />
          </div>

          {/* Auto-populated summary box (read-only preview) */}
          <div className="rounded border border-border bg-muted/10 p-3 text-[11px] text-text-muted space-y-1.5">
            <Row label="Subject">[{finding.severity}] {finding.name} — {scannedUrl}</Row>
            <Row label="Endpoint" mono>{scannedUrl}</Row>
            <Row label="Detail">{finding.detail}</Row>
            {finding.remediation && <Row label="Fix">{finding.remediation}</Row>}
          </div>

          {/* Result */}
          {result && (
            <div
              data-testid="notify-modal-status"
              className={`flex items-start gap-2 rounded p-2.5 text-xs ${
                result.ok ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                          : 'bg-red-500/10 text-red-300 border border-red-500/30'
              }`}
            >
              {result.ok
                ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />}
              <span>{result.message}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded border border-border text-sm text-text-muted hover:bg-muted/30"
          >
            Cancel
          </button>
          <button
            data-testid="notify-modal-send"
            onClick={handleSend}
            disabled={!canSend}
            className={`flex items-center gap-2 px-4 py-1.5 rounded text-sm font-semibold ${
              canSend
                ? 'bg-primary text-white hover:bg-primary/90'
                : 'bg-muted/30 text-text-faint cursor-not-allowed'
            }`}
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {submitting ? 'Sending…' : 'Send notification'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, children, mono }: { label: string; children: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex gap-2">
      <span className="text-text-faint shrink-0 w-16">{label}:</span>
      <span className={mono ? 'font-mono break-all' : 'break-words'}>{children}</span>
    </div>
  );
}

export default NotifyDeveloperModal;
