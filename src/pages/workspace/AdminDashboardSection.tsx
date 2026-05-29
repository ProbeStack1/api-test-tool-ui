/**
 * AdminDashboardSection — enterprise-grade workspace admin overview,
 * shown ONLY when the current user's role on the workspace is
 * `OWNER` or `ADMIN`. Otherwise the parent dashboard hides this section.
 *
 * What it pulls (all from existing services — no new backend):
 *   • Members + roles               → `workspace-mgmt-svc /workspaces/{id}/members`
 *   • Pending invitations            → `workspace-mgmt-svc /workspaces/{id}/invitations`
 *   • All-members activity timeline  → `audit-svc /activity/workspace/{id}?allMembers=true`
 *   • Workspace dashboard summary    → `dashboard-svc /dashboard/feature-summary`
 *
 * Visual breakdown (full enterprise dashboard):
 *   1. Role-count KPI row
 *   2. Members table with role chips + last-active stat
 *   3. Pending invitations card
 *   4. Activity-per-member bar chart (top 10)
 *   5. Top-action breakdown
 *   6. Recent all-members activity feed (last 50, filterable)
 *   7. Export bar — PDF / HTML / CSV
 */
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Crown, ShieldCheck, Edit3, Eye, Users, Activity, FileDown, FileText,
  FileSpreadsheet, Mail, RefreshCw, Loader2, AlertCircle, Filter, Clock,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import {
  apiListMembers, apiListInvitations,
  type MemberDto, type InvitationDto, type MemberRole,
} from '@/api/workspace.api';
import { apiTimelineWorkspace, type TimelineEntry } from '@/api/audit.api';
import { getOverview } from '@/api/dashboard.api';
import {
  exportAdminReportPDF, exportAdminReportHTML, exportAdminReportCSV,
  type AdminReportData,
} from './exportAdminReport';

const ROLE_META: Record<MemberRole, { icon: any; color: string; bg: string }> = {
  OWNER:  { icon: Crown,       color: 'text-purple-600 dark:text-purple-300', bg: 'bg-purple-500/10' },
  ADMIN:  { icon: ShieldCheck, color: 'text-blue-600   dark:text-blue-300',   bg: 'bg-blue-500/10' },
  EDITOR: { icon: Edit3,       color: 'text-emerald-600 dark:text-emerald-300', bg: 'bg-emerald-500/10' },
  VIEWER: { icon: Eye,         color: 'text-slate-600 dark:text-slate-300',  bg: 'bg-slate-500/10' },
};

interface Props {
  workspaceId: string;
  workspaceName: string;
}

export const AdminDashboardSection = ({ workspaceId, workspaceName }: Props) => {
  const [actorFilter, setActorFilter] = useState<string>('');
  const [actionFilter, setActionFilter] = useState<string>('');
  const [exporting, setExporting] = useState<'pdf' | 'html' | 'csv' | null>(null);

  /* ── Queries ──────────────────────────────────────────────────────── */
  const membersQ = useQuery({
    queryKey: ['admin', 'members', workspaceId],
    queryFn: () => apiListMembers(workspaceId),
    enabled: !!workspaceId,
    refetchInterval: 60_000,
  });

  const invitationsQ = useQuery({
    queryKey: ['admin', 'invitations', workspaceId],
    queryFn: () => apiListInvitations(workspaceId, 'PENDING'),
    enabled: !!workspaceId,
    refetchInterval: 90_000,
  });

  const activityQ = useQuery({
    queryKey: ['admin', 'activity', workspaceId, actorFilter, actionFilter],
    queryFn: () =>
      apiTimelineWorkspace(workspaceId, {
        allMembers: true,
        size: 200,
        ...(actorFilter ? { actorEmail: actorFilter } : {}),
        ...(actionFilter ? { actions: actionFilter } : {}),
      }),
    enabled: !!workspaceId,
    refetchInterval: 45_000,
  });

  const overviewQ = useQuery({
    queryKey: ['admin', 'overview', workspaceId],
    queryFn: () => getOverview(workspaceId),
    enabled: !!workspaceId,
  });

  /* ── Derived ─────────────────────────────────────────────────────── */
  const members: MemberDto[] = membersQ.data ?? [];
  const invitations: InvitationDto[] = invitationsQ.data ?? [];
  const activity: TimelineEntry[] = activityQ.data?.items ?? [];

  const roleCounts = useMemo(() => {
    const c = { OWNER: 0, ADMIN: 0, EDITOR: 0, VIEWER: 0 };
    members.forEach((m) => { c[m.role] = (c[m.role] || 0) + 1; });
    return c;
  }, [members]);

  const perMemberActivity = useMemo(() => {
    const map = new Map<string, number>();
    activity.forEach((a) => {
      const k = a.actorEmail || 'system';
      map.set(k, (map.get(k) ?? 0) + 1);
    });
    return Array.from(map.entries())
      .map(([email, events]) => ({ email, events }))
      .sort((a, b) => b.events - a.events);
  }, [activity]);

  const perActionBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    activity.forEach((a) => {
      const k = a.action || 'unknown';
      map.set(k, (map.get(k) ?? 0) + 1);
    });
    return Array.from(map.entries())
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count);
  }, [activity]);

  const maxPerMember = Math.max(1, ...perMemberActivity.map((p) => p.events));
  const maxPerAction = Math.max(1, ...perActionBreakdown.map((a) => a.count));

  const lastActiveByEmail = useMemo(() => {
    const map = new Map<string, number>();
    activity.forEach((a) => {
      if (!a.actorEmail || !a.timestamp) return;
      const t = typeof a.timestamp === 'number' ? a.timestamp : Date.parse(String(a.timestamp));
      if (Number.isFinite(t)) {
        const prev = map.get(a.actorEmail) || 0;
        if (t > prev) map.set(a.actorEmail, t);
      }
    });
    return map;
  }, [activity]);

  const refreshAll = () => {
    membersQ.refetch();
    invitationsQ.refetch();
    activityQ.refetch();
    overviewQ.refetch();
  };

  /* ── Export ──────────────────────────────────────────────────────── */
  const buildReportData = (): AdminReportData => {
    const ov = overviewQ.data;
    return {
      workspaceName,
      workspaceId,
      generatedAt: new Date().toLocaleString(),
      totals: {
        members: members.length,
        owners:  roleCounts.OWNER,
        admins:  roleCounts.ADMIN,
        editors: roleCounts.EDITOR,
        viewers: roleCounts.VIEWER,
        activities30d: activity.length,
        requests:       ov?.kpis?.requests?.total,
        collections:    ov?.kpis?.collections?.total,
        monitorRuns:    ov?.kpis?.monitorRuns?.total,
        functionalRuns: ov?.kpis?.functionalRuns?.total,
        loadRuns:       ov?.kpis?.loadRuns?.total,
      },
      members: members.map((m) => ({
        email: m.userEmail, name: m.userName, role: m.role, joinedAt: m.joinedAt,
      })),
      activity: activity.map((a) => ({
        timestamp: a.timestamp, actorEmail: a.actorEmail, action: a.action,
        resource: a.resource, service: a.service, statusCode: a.statusCode,
        severity: typeof a.severity === 'string' ? a.severity : undefined,
      })),
      perMemberActivity,
      perActionBreakdown,
    };
  };

  const doExport = async (kind: 'pdf' | 'html' | 'csv') => {
    setExporting(kind);
    try {
      const data = buildReportData();
      if (kind === 'pdf')   exportAdminReportPDF(data);
      else if (kind === 'html') exportAdminReportHTML(data);
      else                  exportAdminReportCSV(data);
    } finally {
      setTimeout(() => setExporting(null), 800);
    }
  };

  /* ── Render ──────────────────────────────────────────────────────── */
  return (
    <section className="space-y-5 rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-500/[0.06] via-transparent to-transparent p-6 ring-1 ring-purple-500/10"
             data-testid="admin-dashboard-section">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Crown className="h-4 w-4 text-purple-500" />
            <span className="rounded bg-purple-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-300">
              Admin View
            </span>
          </div>
          <h2 className="text-xl font-semibold tracking-tight" data-testid="admin-dashboard-heading">
            Workspace Administration
          </h2>
          <p className="text-xs text-text-muted">
            Members, roles, access, and complete activity across <strong>{workspaceName}</strong>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={refreshAll}
                  data-testid="admin-dashboard-refresh"
                  className="grid h-8 w-8 place-items-center rounded-md border border-border bg-surface text-text-muted hover:bg-elevated hover:text-text-primary">
            <RefreshCw className={cn('h-3.5 w-3.5', (membersQ.isFetching || activityQ.isFetching) && 'animate-spin')} />
          </button>
          <ExportButton kind="pdf"  current={exporting} onClick={() => doExport('pdf')}  />
          <ExportButton kind="html" current={exporting} onClick={() => doExport('html')} />
          <ExportButton kind="csv"  current={exporting} onClick={() => doExport('csv')}  />
        </div>
      </div>

      {/* Role KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        <RoleKpi role="OWNER"  count={roleCounts.OWNER}  />
        <RoleKpi role="ADMIN"  count={roleCounts.ADMIN}  />
        <RoleKpi role="EDITOR" count={roleCounts.EDITOR} />
        <RoleKpi role="VIEWER" count={roleCounts.VIEWER} />
        <div className="rounded-lg border border-border bg-surface p-3" data-testid="admin-kpi-activity">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
            <Activity className="h-3 w-3" /> Recent activity
          </div>
          <div className="mt-1 font-mono text-xl font-bold">{activity.length.toLocaleString()}</div>
          <div className="text-[10px] text-text-muted">events tracked</div>
        </div>
      </div>

      {/* Members + Pending invites */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Members table */}
        <div className="rounded-xl border border-border bg-surface lg:col-span-2" data-testid="admin-members-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-500" />
              <h3 className="text-sm font-semibold">Members ({members.length})</h3>
            </div>
            {membersQ.isLoading && <Loader2 className="h-3 w-3 animate-spin text-text-muted" />}
          </div>
          <div className="max-h-[320px] overflow-auto">
            <table className="w-full text-[12px]">
              <thead className="sticky top-0 bg-elevated/80 backdrop-blur">
                <tr className="text-left text-[10px] uppercase tracking-wide text-text-muted">
                  <th className="px-3 py-2 font-semibold">Name</th>
                  <th className="px-3 py-2 font-semibold">Email</th>
                  <th className="px-3 py-2 font-semibold">Role</th>
                  <th className="px-3 py-2 font-semibold">Joined</th>
                  <th className="px-3 py-2 font-semibold">Last active</th>
                </tr>
              </thead>
              <tbody>
                {members.length === 0 ? (
                  <tr><td colSpan={5} className="px-3 py-6 text-center text-text-muted">No members yet.</td></tr>
                ) : members.map((m) => {
                  const last = lastActiveByEmail.get(m.userEmail);
                  return (
                    <tr key={m.id} className="border-t border-border/40"
                        data-testid={`admin-member-row-${m.userEmail}`}>
                      <td className="px-3 py-2 font-semibold">{m.userName || '—'}</td>
                      <td className="px-3 py-2 font-mono text-[11px] text-text-secondary">{m.userEmail}</td>
                      <td className="px-3 py-2"><RoleChip role={m.role} /></td>
                      <td className="px-3 py-2 text-[11px] text-text-muted">
                        {m.joinedAt ? new Date(m.joinedAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-3 py-2 text-[11px] text-text-muted">
                        {last ? <span className="inline-flex items-center gap-1"><Clock className="h-2.5 w-2.5" />{relativeTime(last)}</span> : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pending invitations */}
        <div className="rounded-xl border border-border bg-surface" data-testid="admin-invitations-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-amber-500" />
              <h3 className="text-sm font-semibold">Pending invites ({invitations.length})</h3>
            </div>
            {invitationsQ.isLoading && <Loader2 className="h-3 w-3 animate-spin text-text-muted" />}
          </div>
          <div className="max-h-[320px] space-y-2 overflow-auto p-3">
            {invitations.length === 0 ? (
              <div className="py-6 text-center text-[12px] text-text-muted">No pending invites.</div>
            ) : invitations.map((inv) => (
              <div key={inv.id} className="rounded-md border border-amber-500/20 bg-amber-500/5 p-2 text-[11px]"
                   data-testid={`admin-invitation-${inv.invitedEmail}`}>
                <div className="font-mono font-semibold text-text-primary">{inv.invitedEmail}</div>
                <div className="mt-0.5 flex items-center justify-between text-text-muted">
                  <RoleChip role={inv.invitedRole} small />
                  <span>{relativeTime(Date.parse(inv.invitedAt))}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Activity bars */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Per-member activity */}
        <div className="rounded-xl border border-border bg-surface p-4" data-testid="admin-per-member-card">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Activity className="h-4 w-4 text-purple-500" />
            Activity per member · top 10
          </h3>
          {perMemberActivity.length === 0 ? (
            <div className="py-8 text-center text-[12px] text-text-muted">No tracked activity yet.</div>
          ) : (
            <div className="space-y-1.5">
              {perMemberActivity.slice(0, 10).map((m) => (
                <div key={m.email} className="grid grid-cols-[1fr,auto] items-center gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-mono text-[11px] font-semibold">{m.email}</div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-elevated">
                      <div className="h-full bg-purple-500"
                           style={{ width: `${(m.events / maxPerMember) * 100}%` }} />
                    </div>
                  </div>
                  <span className="font-mono text-[11px] font-bold text-purple-600 dark:text-purple-300">{m.events}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action breakdown */}
        <div className="rounded-xl border border-border bg-surface p-4" data-testid="admin-action-breakdown-card">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Filter className="h-4 w-4 text-blue-500" />
            Top actions · last 200 events
          </h3>
          {perActionBreakdown.length === 0 ? (
            <div className="py-8 text-center text-[12px] text-text-muted">No tracked actions yet.</div>
          ) : (
            <div className="space-y-1.5">
              {perActionBreakdown.slice(0, 10).map((a) => (
                <div key={a.action} className="grid grid-cols-[1fr,auto] items-center gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-mono text-[11px] font-semibold">{a.action}</div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-elevated">
                      <div className="h-full bg-blue-500"
                           style={{ width: `${(a.count / maxPerAction) * 100}%` }} />
                    </div>
                  </div>
                  <span className="font-mono text-[11px] font-bold text-blue-600 dark:text-blue-300">{a.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent activity feed with filters */}
      <div className="rounded-xl border border-border bg-surface" data-testid="admin-activity-feed-card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-purple-500" />
            <h3 className="text-sm font-semibold">Recent activity · all members</h3>
          </div>
          <div className="flex gap-2">
            <input type="text" value={actorFilter} onChange={(e) => setActorFilter(e.target.value)}
                   placeholder="filter by actor email"
                   data-testid="admin-activity-actor-filter"
                   className="rounded-md border border-border bg-elevated px-2 py-1 text-[11px] outline-none focus:border-primary" />
            <input type="text" value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}
                   placeholder="filter by action (CSV)"
                   data-testid="admin-activity-action-filter"
                   className="rounded-md border border-border bg-elevated px-2 py-1 text-[11px] outline-none focus:border-primary" />
          </div>
        </div>
        <div className="max-h-[400px] overflow-auto">
          {activityQ.isLoading ? (
            <div className="flex items-center justify-center py-10 text-text-muted">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading activity…
            </div>
          ) : activity.length === 0 ? (
            <div className="py-10 text-center text-[12px] text-text-muted">
              <AlertCircle className="mx-auto mb-2 h-6 w-6 opacity-40" />
              No tracked activity matching the current filters.
            </div>
          ) : (
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 bg-elevated/80 backdrop-blur">
                <tr className="text-left text-[10px] uppercase tracking-wide text-text-muted">
                  <th className="px-3 py-2 font-semibold">Time</th>
                  <th className="px-3 py-2 font-semibold">Actor</th>
                  <th className="px-3 py-2 font-semibold">Severity</th>
                  <th className="px-3 py-2 font-semibold">Action</th>
                  <th className="px-3 py-2 font-semibold">Resource</th>
                  <th className="px-3 py-2 font-semibold">Service</th>
                  <th className="px-3 py-2 font-semibold">HTTP</th>
                </tr>
              </thead>
              <tbody>
                {activity.slice(0, 100).map((a, i) => (
                  <tr key={a.eventId + i} className="border-t border-border/40"
                      data-testid={`admin-activity-row-${i}`}>
                    <td className="px-3 py-1.5 font-mono text-text-muted">
                      {a.timestamp ? new Date(a.timestamp as any).toLocaleString() : '—'}
                    </td>
                    <td className="px-3 py-1.5 font-mono text-text-secondary">{a.actorEmail || 'system'}</td>
                    <td className="px-3 py-1.5"><SeverityChip s={a.severity} /></td>
                    <td className="px-3 py-1.5 font-mono font-semibold">{a.action}</td>
                    <td className="px-3 py-1.5 text-text-muted">{a.resource || ''}</td>
                    <td className="px-3 py-1.5 text-text-muted">{a.service || ''}</td>
                    <td className="px-3 py-1.5 font-mono">{a.statusCode ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </section>
  );
};

/* ────────────────────────── Sub-components ────────────────────────────── */

const RoleKpi = ({ role, count }: { role: MemberRole; count: number }) => {
  const meta = ROLE_META[role];
  const Icon = meta.icon;
  return (
    <div className={cn('rounded-lg border border-border bg-surface p-3')}
         data-testid={`admin-kpi-${role.toLowerCase()}`}>
      <div className="flex items-center gap-2">
        <div className={cn('grid h-7 w-7 place-items-center rounded-md', meta.bg, meta.color)}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">{role}</span>
      </div>
      <div className="mt-1 font-mono text-xl font-bold">{count}</div>
    </div>
  );
};

const RoleChip = ({ role, small }: { role: MemberRole; small?: boolean }) => {
  const meta = ROLE_META[role];
  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full font-mono font-semibold uppercase tracking-wide',
      meta.bg, meta.color,
      small ? 'px-1.5 py-0 text-[9px]' : 'px-2 py-0.5 text-[10px]',
    )}>
      {role}
    </span>
  );
};

const SeverityChip = ({ s }: { s?: string }) => {
  const sev = (s || 'INFO').toUpperCase();
  const cls =
    sev === 'CRITICAL' || sev === 'ERROR' ? 'bg-danger/15 text-danger'
    : sev === 'WARN' ? 'bg-amber-500/15 text-amber-600 dark:text-amber-300'
    : 'bg-blue-500/15 text-blue-600 dark:text-blue-300';
  return (
    <span className={cn('inline-block rounded-full px-1.5 py-0.5 font-mono text-[9px] font-semibold', cls)}>
      {sev}
    </span>
  );
};

const ExportButton = ({
  kind, current, onClick,
}: { kind: 'pdf' | 'html' | 'csv'; current: 'pdf' | 'html' | 'csv' | null; onClick: () => void }) => {
  const labels = { pdf: 'PDF', html: 'HTML', csv: 'CSV' };
  const icons  = { pdf: FileText, html: FileDown, csv: FileSpreadsheet };
  const Icon = icons[kind];
  const isLoading = current === kind;
  return (
    <button type="button" onClick={onClick} disabled={current !== null}
            data-testid={`admin-export-${kind}`}
            className="inline-flex items-center gap-1 rounded-md border border-purple-500/40 bg-purple-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-purple-600 dark:text-purple-300 hover:bg-purple-500/20 disabled:opacity-50">
      {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Icon className="h-3 w-3" />}
      {labels[kind]}
    </button>
  );
};

/** "5m ago" / "2h ago" / "3d ago" / absolute date for older items. */
function relativeTime(ts: number): string {
  if (!Number.isFinite(ts) || ts <= 0) return '—';
  const diff = Date.now() - ts;
  if (diff < 0) return 'just now';
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  try { return new Date(ts).toLocaleDateString(); } catch { return '—'; }
}
