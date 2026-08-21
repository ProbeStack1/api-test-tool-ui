/**
 * ConfirmEmailChangePage — `/auth/confirm-email-change?token=...`
 *
 * What the user sees when they click the confirmation link sent to their
 * NEW email address after requesting an email change from Profile → Security:
 *   1. "Confirming your new email..." spinner.
 *   2. Success: new email is now active, redirect to sign in (the old
 *      session's token still carries the old email, so a fresh sign-in
 *      picks up the change).
 *   3. Failure: expired/invalid token, clear recovery action.
 *
 * The token round-trips against `POST /api/v1/users/confirm-email-change`
 * — mirrors VerifyEmailPage.tsx's pattern exactly. This page did not exist
 * before: the backend endpoint was fully built but had nowhere to send
 * the confirmation link to.
 */
import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2, MailCheck, AlertTriangle, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/Button';
import { userMgmtService } from '../../services/userMgmt.service';

type Phase =
  | { kind: 'confirming' }
  | { kind: 'success'; email?: string }
  | { kind: 'expired' }
  | { kind: 'error'; message: string }
  | { kind: 'no-token' };

const MIN_MS = 700;
const SUCCESS_PAUSE_MS = 1600;

export const ConfirmEmailChangePage = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') ?? '';
  const [phase, setPhase] = useState<Phase>(token ? { kind: 'confirming' } : { kind: 'no-token' });
  const startedRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    startedRef.current = Date.now();

    userMgmtService
      .confirmEmailChange(token)
      .then(async (user) => {
        const elapsed = Date.now() - startedRef.current;
        if (elapsed < MIN_MS) await new Promise((r) => setTimeout(r, MIN_MS - elapsed));
        if (cancelled) return;
        setPhase({ kind: 'success', email: user?.email });

        setTimeout(() => {
          if (cancelled) return;
          toast.success('Email updated — please sign in again', { duration: 5000 });
          navigate('/login', { replace: true });
        }, SUCCESS_PAUSE_MS);
      })
      .catch((e: any) => {
        if (cancelled) return;
        const code = e?.code ?? '';
        const msg = (e?.message ?? '').toLowerCase();
        if (code === 'AUTH_TOKEN_EXPIRED' || msg.includes('expired')) {
          setPhase({ kind: 'expired' });
        } else {
          setPhase({ kind: 'error', message: e?.message ?? 'Could not confirm email change' });
        }
      });

    return () => { cancelled = true; };
  }, [token, navigate]);

  return (
    <div
      data-testid="confirm-email-change-page"
      className="flex min-h-screen items-center justify-center bg-probestack-bg p-6"
    >
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 shadow-2xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-muted text-primary">
            <MailCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-semibold tracking-tight">Confirm email change</h1>
            <p className="text-xs text-text-secondary">ForgeFuzz account security</p>
          </div>
        </div>

        {phase.kind === 'confirming' && (
          <div className="flex flex-col items-center gap-4 py-6" data-testid="confirm-state-confirming">
            <div className="relative">
              <div className="h-20 w-20 rounded-full border-4 border-primary/15" />
              <Loader2 className="absolute inset-0 m-auto h-10 w-10 animate-spin text-primary" />
            </div>
            <div className="text-center">
              <div className="text-sm font-semibold">Confirming your new email…</div>
              <p className="mt-1 text-xs text-text-muted">Just a moment, updating your account.</p>
            </div>
          </div>
        )}

        {phase.kind === 'success' && (
          <div className="flex flex-col items-center gap-4 py-6" data-testid="confirm-state-success">
            <div className="relative">
              <div className="h-20 w-20 rounded-full bg-success/15 animate-pulse" />
              <CheckCircle2 className="absolute inset-0 m-auto h-12 w-12 text-success" />
            </div>
            <div className="text-center">
              <div className="text-sm font-semibold text-success">Email updated</div>
              <p className="mt-1 text-xs text-text-muted">
                {phase.email ? `Your account email is now ${phase.email}. ` : ''}
                Redirecting you to sign in…
              </p>
            </div>
          </div>
        )}

        {phase.kind === 'expired' && (
          <div className="space-y-4" data-testid="confirm-state-expired">
            <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-xs text-warning">
              <AlertTriangle className="mt-[1px] h-4 w-4 shrink-0" />
              <span>This confirmation link has expired. Start the email change again from your profile.</span>
            </div>
            <Link to="/projects/profile">
              <Button variant="primary" className="w-full" data-testid="confirm-goto-profile">
                Go to profile <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        )}

        {phase.kind === 'error' && (
          <div className="space-y-4" data-testid="confirm-state-error">
            <div className="flex items-start gap-2 rounded-md border border-danger/40 bg-danger/10 p-3 text-xs text-danger">
              <AlertTriangle className="mt-[1px] h-4 w-4 shrink-0" />
              <span>{phase.message}</span>
            </div>
            <Link to="/login">
              <Button variant="outline" className="w-full" data-testid="confirm-goto-login">
                Go to sign in
              </Button>
            </Link>
          </div>
        )}

        {phase.kind === 'no-token' && (
          <div data-testid="confirm-state-notoken" className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-xs text-warning">
            <AlertTriangle className="mt-[1px] h-4 w-4 shrink-0" />
            <span>This page expects a <code>?token=…</code> parameter from your email link.</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConfirmEmailChangePage;
