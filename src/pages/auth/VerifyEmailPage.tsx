/**
 * VerifyEmailPage — `/auth/verify-email?token=...`
 *
 * What the user sees when they click the verification link in the mail:
 *   1. "Verifying your email..." with brand spinner (~600ms min so the
 *      transition never flashes too fast even on a fast network).
 *   2. Success: "✅ Email verified" tick animation, 1.6 s pause, then
 *      auto-redirect to /login with a success toast.
 *   3. Failure: clear error message with recovery actions:
 *        - expired link  → "Resend verification email" button
 *        - already-verified / invalid → "Go to login" button
 *
 * The token round-trips against `POST /api/v1/users/verify-email`.
 */
import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2, MailCheck, AlertTriangle, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { userMgmtService } from '@/services/userMgmt.service';

type Phase =
  | { kind: 'verifying' }
  | { kind: 'success' }
  | { kind: 'expired' }
  | { kind: 'already' }
  | { kind: 'error'; message: string }
  | { kind: 'no-token' };

const MIN_VERIFY_MS = 700;       // never flash sub-700ms
const SUCCESS_PAUSE_MS = 1600;   // dwell on the green tick before nav

export const VerifyEmailPage = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') ?? '';
  const [phase, setPhase] = useState<Phase>(token ? { kind: 'verifying' } : { kind: 'no-token' });
  const [resending, setResending] = useState(false);
  const [resendEmail, setResendEmail] = useState('');
  const startedRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    startedRef.current = Date.now();

    userMgmtService
      .verifyEmail(token)
      .then(async () => {
        // honour minimum dwell so the "verifying..." animation never flashes
        const elapsed = Date.now() - startedRef.current;
        if (elapsed < MIN_VERIFY_MS) await new Promise((r) => setTimeout(r, MIN_VERIFY_MS - elapsed));
        if (cancelled) return;
        setPhase({ kind: 'success' });

        setTimeout(() => {
          if (cancelled) return;
          toast.success('Email verified — please sign in', { duration: 5000 });
          navigate('/login?verified=1', { replace: true });
        }, SUCCESS_PAUSE_MS);
      })
      .catch((e: any) => {
        if (cancelled) return;
        const code = e?.code ?? '';
        const msg = (e?.message ?? '').toLowerCase();
        if (code === 'AUTH_TOKEN_EXPIRED' || msg.includes('expired')) {
          setPhase({ kind: 'expired' });
        } else if (code === 'AUTH_EMAIL_ALREADY_VERIFIED' || msg.includes('already')) {
          setPhase({ kind: 'already' });
        } else {
          setPhase({ kind: 'error', message: e?.message ?? 'Verification failed' });
        }
      });

    return () => { cancelled = true; };
  }, [token, navigate]);

  const handleResend = async () => {
    if (!resendEmail.trim()) {
      toast.error('Enter your account email to resend the link');
      return;
    }
    setResending(true);
    try {
      await userMgmtService.resendVerification(resendEmail.trim());
      toast.success('Verification email sent. Check your inbox.');
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not resend verification email');
    } finally {
      setResending(false);
    }
  };

  return (
    <div
      data-testid="verify-email-page"
      className="flex min-h-screen items-center justify-center bg-probestack-bg p-6"
    >
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 shadow-2xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-muted text-primary">
            <MailCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-semibold tracking-tight">Email verification</h1>
            <p className="text-xs text-text-secondary">ForgeFuzz secure sign-up</p>
          </div>
        </div>

        {phase.kind === 'verifying' && (
          <div className="flex flex-col items-center gap-4 py-6" data-testid="verify-state-verifying">
            <div className="relative">
              <div className="h-20 w-20 rounded-full border-4 border-primary/15" />
              <Loader2 className="absolute inset-0 m-auto h-10 w-10 animate-spin text-primary" />
            </div>
            <div className="text-center">
              <div className="text-sm font-semibold">Verifying your email…</div>
              <p className="mt-1 text-xs text-text-muted">Just a moment, securing your account.</p>
            </div>
          </div>
        )}

        {phase.kind === 'success' && (
          <div className="flex flex-col items-center gap-4 py-6" data-testid="verify-state-success">
            <div className="relative">
              <div className="h-20 w-20 rounded-full bg-success/15 animate-pulse" />
              <CheckCircle2 className="absolute inset-0 m-auto h-12 w-12 text-success" />
            </div>
            <div className="text-center">
              <div className="text-sm font-semibold text-success">Email verified</div>
              <p className="mt-1 text-xs text-text-muted">Redirecting you to sign in…</p>
            </div>
          </div>
        )}

        {phase.kind === 'expired' && (
          <div className="space-y-4" data-testid="verify-state-expired">
            <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-xs text-warning">
              <AlertTriangle className="mt-[1px] h-4 w-4 shrink-0" />
              <span>This verification link has expired. Request a fresh one below.</span>
            </div>
            <div className="space-y-2">
              <label htmlFor="resend-email" className="block text-xs font-medium text-text-secondary">
                Your account email
              </label>
              <input
                id="resend-email"
                type="email"
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
                placeholder="you@example.com"
                data-testid="verify-resend-email"
                className="h-9 w-full rounded-md border border-border bg-probestack-bg px-2 text-xs outline-none focus:border-primary"
              />
              <Button
                variant="primary"
                disabled={resending}
                onClick={handleResend}
                data-testid="verify-resend-btn"
                className="w-full"
              >
                {resending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MailCheck className="h-4 w-4" />}
                Resend verification email
              </Button>
            </div>
          </div>
        )}

        {phase.kind === 'already' && (
          <div className="space-y-4" data-testid="verify-state-already">
            <div className="flex items-start gap-2 rounded-md border border-success/40 bg-success/10 p-3 text-xs text-success">
              <CheckCircle2 className="mt-[1px] h-4 w-4 shrink-0" />
              <span>This email is already verified. You can sign in directly.</span>
            </div>
            <Link to="/login">
              <Button variant="primary" className="w-full" data-testid="verify-goto-login">
                Go to sign in <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        )}

        {phase.kind === 'error' && (
          <div className="space-y-4" data-testid="verify-state-error">
            <div className="flex items-start gap-2 rounded-md border border-danger/40 bg-danger/10 p-3 text-xs text-danger">
              <AlertTriangle className="mt-[1px] h-4 w-4 shrink-0" />
              <span>{phase.message}</span>
            </div>
            <Link to="/login">
              <Button variant="outline" className="w-full" data-testid="verify-goto-login">
                Go to sign in
              </Button>
            </Link>
          </div>
        )}

        {phase.kind === 'no-token' && (
          <div data-testid="verify-state-notoken" className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-xs text-warning">
            <AlertTriangle className="mt-[1px] h-4 w-4 shrink-0" />
            <span>This page expects a <code>?token=…</code> parameter from your email link.</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyEmailPage;
