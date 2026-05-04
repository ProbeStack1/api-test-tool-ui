/**
 * Public shared-entity view. Lands here when a user opens
 * `/shared/<token>`. No auth required — the page just resolves the token
 * against the Collaboration service, then shows what entity the recipient
 * just got access to along with the access level.
 */
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { Link2, Loader2, ShieldAlert } from 'lucide-react';
import { resolveSharedToken } from '@/api/collab.api';

export const SharedEntityPage = () => {
  const { token = '' } = useParams<{ token: string }>();
  const q = useQuery({
    queryKey: ['collab', 'shared', token],
    queryFn: () => resolveSharedToken(token),
    enabled: !!token,
    retry: false,
  });

  return (
    <div className="grid min-h-screen place-items-center bg-probestack-bg p-6" data-testid="shared-entity-page">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-surface p-6 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
            <Link2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-semibold">Shared with you</h1>
            <p className="text-[11px] text-text-muted">via ForgeQ collaboration</p>
          </div>
        </div>

        <div className="mt-5">
          {q.isLoading ? (
            <p className="flex items-center gap-1 text-xs text-text-muted"><Loader2 className="h-3 w-3 animate-spin" /> Verifying link…</p>
          ) : q.isError || !q.data ? (
            <div className="rounded-lg border border-danger/30 bg-danger/5 p-4 text-xs text-danger" data-testid="shared-entity-invalid">
              <div className="mb-1 flex items-center gap-1.5 font-semibold"><ShieldAlert className="h-3.5 w-3.5" /> Link invalid or expired</div>
              Ask the sender to re-share.
            </div>
          ) : (
            <div className="space-y-3" data-testid="shared-entity-ok">
              <Row label="Entity type">{q.data.entityType}</Row>
              <Row label="Entity ID"><span className="font-mono text-[11px]">{q.data.entityId}</span></Row>
              <Row label="Access"><Badge access={q.data.accessType} /></Row>
              {q.data.expiresAt && <Row label="Expires">{new Date(q.data.expiresAt).toLocaleString()}</Row>}
              <p className="mt-4 rounded-md border border-dashed border-border p-3 text-[11px] text-text-muted">
                Sign in to your workspace to continue with this {q.data.entityType}.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-baseline justify-between gap-3 border-b border-border/60 pb-1.5 text-xs">
    <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">{label}</span>
    <span className="text-right text-text-primary">{children}</span>
  </div>
);

const Badge = ({ access }: { access: string }) => (
  <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${access === 'edit' ? 'bg-warning/15 text-warning' : 'bg-primary/15 text-primary'}`}>
    {access}
  </span>
);
