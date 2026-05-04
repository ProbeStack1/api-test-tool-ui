/**
 * Accept Invitation page — landing for email/copy-link invitation tokens.
 * Calls the project service:
 *   GET  /api/v1/workspaces/invitations/peek/{token}
 *   POST /api/v1/workspaces/invitations/accept   { token }
 *   POST /api/v1/workspaces/invitations/reject   { token }
 */
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Loader2, Check, X, AlertTriangle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  acceptInvitation,
  peekInvitation,
  rejectInvitation,
  type Invitation,
} from '@/services/workspace.service';

type State =
  | { kind: 'loading' }
  | { kind: 'no-token' }
  | { kind: 'error'; message: string }
  | { kind: 'ok'; inv: Invitation }
  | { kind: 'accepted'; inv: Invitation }
  | { kind: 'rejected'; inv: Invitation };

export const AcceptInvitationPage = () => {
  const [search] = useSearchParams();
  const nav = useNavigate();
  const token = search.get('token') ?? '';
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [busy, setBusy] = useState<'accept' | 'reject' | null>(null);

  useEffect(() => {
    if (!token) {
      setState({ kind: 'no-token' });
      return;
    }
    let cancelled = false;
    peekInvitation(token)
      .then((inv) => !cancelled && setState({ kind: 'ok', inv }))
      .catch((e: any) =>
        !cancelled &&
        setState({ kind: 'error', message: e?.message ?? 'Invitation could not be loaded' }),
      );
    return () => {
      cancelled = true;
    };
  }, [token]);

  const onAccept = async () => {
    if (state.kind !== 'ok') return;
    setBusy('accept');
    try {
      const inv = await acceptInvitation(token);
      setState({ kind: 'accepted', inv });
    } catch (e: any) {
      setState({ kind: 'error', message: e?.message ?? 'Could not accept invitation' });
    } finally {
      setBusy(null);
    }
  };

  const onReject = async () => {
    if (state.kind !== 'ok') return;
    setBusy('reject');
    try {
      const inv = await rejectInvitation(token);
      setState({ kind: 'rejected', inv });
    } catch (e: any) {
      setState({ kind: 'error', message: e?.message ?? 'Could not reject invitation' });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div
      data-testid="accept-invitation-page"
      className="flex min-h-screen items-center justify-center bg-probestack-bg p-6"
    >
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-xl">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-muted text-primary">
            <Mail className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-semibold">Project invitation</h1>
            <p className="text-xs text-text-secondary">Review and accept to join the project.</p>
          </div>
        </div>

        {state.kind === 'loading' && (
          <div className="space-y-3" data-testid="ai-loading">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-9 w-28" />
          </div>
        )}

        {state.kind === 'no-token' && (
          <div
            className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-xs text-warning"
            data-testid="ai-no-token"
          >
            <AlertTriangle className="mt-[1px] h-4 w-4 shrink-0" />
            <span>This page needs a <code>?token=…</code> parameter.</span>
          </div>
        )}

        {state.kind === 'error' && (
          <div
            className="flex items-start gap-2 rounded-md border border-danger/40 bg-danger/10 p-3 text-xs text-danger"
            data-testid="ai-error"
          >
            <AlertTriangle className="mt-[1px] h-4 w-4 shrink-0" />
            <span>{state.message}</span>
          </div>
        )}

        {state.kind === 'ok' && (
          <div className="space-y-3" data-testid="ai-pending">
            <Row label="Project" value={state.inv.workspaceName} />
            <Row label="Invitee" value={state.inv.invitedEmail} />
            <Row label="Role" value={state.inv.invitedRole} />
            <Row label="Inviter" value={state.inv.inviterEmail || state.inv.inviterName || '—'} />
            <Row label="Expires" value={state.inv.expiresAt} mono />
            <div className="flex justify-end gap-2 pt-3">
              <Button
                variant="outline"
                onClick={onReject}
                disabled={busy !== null}
                data-testid="ai-reject"
              >
                {busy === 'reject' ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                Reject
              </Button>
              <Button
                variant="primary"
                onClick={onAccept}
                disabled={busy !== null}
                data-testid="ai-accept"
              >
                {busy === 'accept' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Accept invitation
              </Button>
            </div>
          </div>
        )}

        {state.kind === 'accepted' && (
          <div className="space-y-3" data-testid="ai-accepted">
            <div className="flex items-center gap-2 rounded-md border border-success/40 bg-success/10 p-3 text-xs text-success">
              <Check className="h-4 w-4" /> You joined <strong>{state.inv.workspaceName}</strong>!
            </div>
            <Button variant="primary" onClick={() => nav('/projects/manage')} data-testid="ai-go-workspace">
              Go to workspace <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {state.kind === 'rejected' && (
          <div className="rounded-md border border-border bg-elevated p-3 text-xs text-text-secondary" data-testid="ai-rejected">
            Invitation rejected. You can close this tab.
          </div>
        )}
      </div>
    </div>
  );
};

const Row = ({ label, value, mono }: { label: string; value?: string; mono?: boolean }) => (
  <div className="flex items-center justify-between gap-3 border-b border-border/50 pb-2 text-xs">
    <span className="text-text-secondary">{label}</span>
    <span className={'truncate ' + (mono ? 'font-mono text-[11px]' : 'font-medium')}>{value ?? '—'}</span>
  </div>
);
