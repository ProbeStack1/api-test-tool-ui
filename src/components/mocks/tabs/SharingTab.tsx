/**
 * SharingTab — visibility radio + share-grants list.
 *
 * Visibility update persists immediately so the badge in the header
 * updates without an explicit save.
 *
 * Share grants section: lists project members with toggle access.
 * Grants are persisted on the mock document (`shared_with` array).
 */
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Globe, Building2, Lock, Users, Plus, Trash2, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Tooltip } from '@/components/ui/Tooltip';
import { updateMock, type MockServer, type MockVisibility } from '@/services/mock.service';
import { listMembers as listWorkspaceMembers } from '@/services/workspace.service';
import { cn } from '@/utils/cn';

const OPTIONS: Array<{ key: MockVisibility; icon: any; label: string; tip: string }> = [
  { key: 'PUBLIC',  icon: Globe,     label: 'Public',  tip: 'Anyone with the URL can hit this mock — no auth, no org restriction.' },
  { key: 'ORG',     icon: Building2, label: 'Org',     tip: 'Only authenticated users in your organisation can hit this mock.' },
  { key: 'PRIVATE', icon: Lock,      label: 'Private', tip: 'Only project members and explicit share grants. The most restrictive option.' },
];

export const SharingTab = ({ mock }: { mock: MockServer }) => {
  const qc = useQueryClient();
  const sharedWith: string[] = ((mock as any).sharedWith ?? []) as string[];
  const [draftEmail, setDraftEmail] = useState('');

  const { data: members = [] } = useQuery({
    queryKey: ['workspace-members', mock.workspaceId],
    queryFn: () => listWorkspaceMembers(mock.workspaceId),
    enabled: !!mock.workspaceId,
  });

  const setVisibility = useMutation({
    mutationFn: (v: MockVisibility) => updateMock(mock.id, { visibility: v } as any),
    onSuccess: async (_, v) => {
      await qc.invalidateQueries({ queryKey: ['mock', mock.id] });
      await qc.invalidateQueries({ queryKey: ['mocks'] });
      toast.success(`Visibility set to ${v}`);
    },
    onError: (e: any) => toast.error(e?.message ?? 'Failed to update visibility'),
  });

  const updateGrants = useMutation({
    mutationFn: (next: string[]) => updateMock(mock.id, { sharedWith: next } as any),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['mock', mock.id] });
      toast.success('Share grants updated');
    },
    onError: (e: any) => toast.error(e?.message ?? 'Failed to update grants'),
  });

  const grant = (email: string) => {
    const e = email.trim().toLowerCase();
    if (!e || sharedWith.includes(e)) return;
    updateGrants.mutate([...sharedWith, e]);
    setDraftEmail('');
  };
  const revoke = (email: string) => updateGrants.mutate(sharedWith.filter((x) => x !== email));

  return (
    <div className="space-y-6 p-5" data-testid="mock-sharing-tab">
      {/* Visibility */}
      <section>
        <h3 className="mb-1 text-sm font-semibold">Visibility</h3>
        <p className="mb-3 text-[11px] text-text-muted">
          Who is allowed to call this mock's runtime URL. Changes apply immediately.
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {OPTIONS.map((o) => {
            const active = mock.visibility === o.key;
            return (
              <button
                key={o.key}
                type="button"
                data-testid={`sharing-${o.key.toLowerCase()}`}
                onClick={() => !active && setVisibility.mutate(o.key)}
                disabled={setVisibility.isPending}
                className={cn(
                  'flex items-start gap-2 rounded-md border p-3 text-left transition-colors',
                  active ? 'border-primary bg-primary/5'
                         : 'border-border bg-surface/40 hover:border-primary/40 hover:bg-hover',
                )}
              >
                <o.icon className={cn('mt-0.5 h-4 w-4 shrink-0', active ? 'text-primary' : 'text-text-muted')} />
                <div className="min-w-0 flex-1">
                  <div className={cn('text-xs font-semibold', active ? 'text-primary' : 'text-text-primary')}>
                    {o.label} {active && <span className="ml-1 rounded bg-primary/15 px-1 text-[9px]">CURRENT</span>}
                  </div>
                  <div className="mt-0.5 text-[11px] text-text-muted">{o.tip}</div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Share grants */}
      <section data-testid="mock-sharing-grants">
        <header className="mb-1 flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5 text-primary" />
          <h3 className="text-sm font-semibold">Share grants</h3>
          <span className="rounded bg-elevated px-1.5 py-0.5 font-mono text-[9px] text-text-muted">
            {sharedWith.length}
          </span>
        </header>
        <p className="mb-3 text-[11px] text-text-muted">
          Grant access to specific users by email. They'll be able to hit this mock URL even when visibility is <code className="rounded bg-elevated px-1 font-mono">PRIVATE</code>.
        </p>

        {/* Add by email */}
        <div className="mb-3 flex items-center gap-2">
          <div className="relative flex-1">
            <Mail className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
            <input
              data-testid="sharing-email-input"
              type="email"
              placeholder="user@example.com"
              value={draftEmail}
              onChange={(e) => setDraftEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') grant(draftEmail); }}
              className="h-8 w-full rounded-md border border-border bg-probestack-bg pl-7 pr-2 text-xs outline-none hover:border-primary/40 focus:border-primary"
            />
          </div>
          <Button variant="primary" data-testid="sharing-grant-btn" onClick={() => grant(draftEmail)} disabled={!draftEmail.trim()}>
            <Plus className="h-3.5 w-3.5" /> Grant
          </Button>
        </div>

        {/* Quick-grant from project members */}
        {members.length > 0 && (
          <div className="mb-3 rounded-md border border-border bg-surface/40 p-3">
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
              Quick-grant from project members ({members.length})
            </div>
            <div className="flex flex-wrap gap-1.5">
              {members.slice(0, 12).map((mem) => {
                const granted = sharedWith.includes((mem.userEmail || '').toLowerCase());
                return (
                  <Tooltip key={mem.id} content={granted ? 'Already granted' : `Grant access to ${mem.userName || mem.userEmail}`}>
                    <button
                      data-testid={`sharing-quick-${mem.id}`}
                      onClick={() => !granted && grant(mem.userEmail || '')}
                      disabled={granted || !mem.userEmail}
                      className={cn(
                        'flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] transition-colors',
                        granted
                          ? 'border-success/40 bg-success-muted text-success cursor-default'
                          : 'border-border bg-probestack-bg hover:border-primary/40 hover:bg-hover',
                      )}
                    >
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/10 font-mono text-[9px] text-primary">
                        {(mem.userName || mem.userEmail || '?').charAt(0).toUpperCase()}
                      </span>
                      {mem.userName || mem.userEmail}
                    </button>
                  </Tooltip>
                );
              })}
            </div>
          </div>
        )}

        {/* Granted list */}
        {sharedWith.length === 0 ? (
          <div className="rounded-md border border-dashed border-border bg-surface/30 p-4 text-center text-[11px] text-text-muted" data-testid="sharing-grants-empty">
            No grants yet. Add an email above or quick-grant a project member.
          </div>
        ) : (
          <ul className="overflow-hidden rounded-md border border-border" data-testid="sharing-grants-list">
            {sharedWith.map((email) => (
              <li key={email} data-testid={`sharing-grant-${email}`} className="flex items-center gap-2 border-b border-border/40 px-3 py-1.5 text-xs last:border-b-0">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-[9px] text-primary">
                  {email.charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1 truncate font-mono">{email}</span>
                <Tooltip content="Revoke access">
                  <button
                    onClick={() => revoke(email)}
                    data-testid={`sharing-revoke-${email}`}
                    className="rounded p-1 text-text-muted hover:bg-hover hover:text-danger"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </Tooltip>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};
