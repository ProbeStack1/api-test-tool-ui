/**
 * FeatureSummaryCards — "Everything at a glance" rich Dashboard section.
 *
 * Renders 11 product-area cards (AI Testing, Bug Tracker, Test Specs,
 * Webhooks, Monitors, Mocks, Load Tests, Security, Requests, Chat &
 * Agents, Notifications) populated from a single
 * {@code GET /api/v1/dashboard/feature-summary} call. Each card shows
 * the headline metric, a couple of supporting chips, a status pill or
 * micro-bar where useful, and deep-links into the relevant page.
 *
 * Designed to slot into the existing DashboardPage between the Activity
 * timeline and the KPI matrix, but works standalone too.
 */
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  FlaskConical, Bug, FileCode2, Webhook, Activity, ServerCog, Gauge,
  Shield, Globe, MessageSquare, BellRing, ArrowRight, Users,
} from 'lucide-react';
import { useMemo } from 'react';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { getFeatureSummary, type FeatureSummaryResponse } from '@/api/dashboard.api';

/* ─── Helpers ───────────────────────────────────────────────────────── */

const fmt = (n?: number) => (n == null ? '—' : n.toLocaleString());
const fmtPct = (v?: number) =>
  v == null ? '—' : `${Math.round((v || 0) * 100)}%`;
const fmtUsd = (v?: number) =>
  v == null ? '—' : `$${(v || 0).toFixed(v >= 1 ? 2 : 4)}`;
const fmtRel = (iso?: string) => {
  if (!iso) return 'never';
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return 'just now';
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.round(ms / 3_600_000)}h ago`;
  const d = Math.round(ms / 86_400_000);
  return `${d}d ago`;
};

const sevTone = (k: string) => {
  const s = k.toUpperCase();
  if (s === 'CRITICAL' || s === 'P0') return 'bg-red-500/20 text-red-600 dark:text-red-300';
  if (s === 'HIGH' || s === 'P1') return 'bg-orange-500/20 text-orange-600 dark:text-orange-300';
  if (s === 'MEDIUM' || s === 'P2') return 'bg-amber-500/20 text-amber-700 dark:text-amber-300';
  if (s === 'LOW' || s === 'P3') return 'bg-sky-500/20 text-sky-600 dark:text-sky-300';
  return 'bg-elevated text-text-secondary';
};

/* ─── Public component ──────────────────────────────────────────────── */

export const FeatureSummaryCards = () => {
  const workspaceId = useWorkspaceStore((s) => s.currentId);
  const q = useQuery({
    queryKey: ['dashboard', 'feature-summary', workspaceId ?? 'all'],
    queryFn: () => getFeatureSummary(workspaceId ?? undefined),
    refetchInterval: 60_000,
    enabled: workspaceId !== null && workspaceId !== undefined,
  });

  if (q.isLoading) return <SectionSkeleton />;
  if (q.error || !q.data) return null;
  const d = q.data;

  return (
    <section className="space-y-3" data-testid="dashboard-feature-summary">
      <header className="flex items-end justify-between">
        <div>
          <h2 className="text-base font-semibold">Workspace at a glance</h2>
          <p className="text-xs text-text-muted">
            Live counts across every product area · auto-refresh every 60 s
          </p>
        </div>
        <WorkspaceBadge meta={d.workspace} />
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <AiTestingCard       d={d.aiTesting} ws={workspaceId} />
        <BugTrackerCard      d={d.bugTracker} ws={workspaceId} />
        <TestSpecsCard       d={d.testSpecs} ws={workspaceId} />
        <WebhooksCard        d={d.webhooks} ws={workspaceId} />
        <MonitorsCard        d={d.monitors} ws={workspaceId} />
        <MocksCard           d={d.mocks} ws={workspaceId} />
        <LoadTestsCard       d={d.loadTests} ws={workspaceId} />
        <SecurityCard        d={d.security} ws={workspaceId} />
        <RequestsCard        d={d.requests} ws={workspaceId} />
        <ChatAgentsCard      d={d.chatAndAgents} ws={workspaceId} />
        <NotificationsCard   d={d.notifications} />
      </div>
    </section>
  );
};

/* ─── Individual cards ──────────────────────────────────────────────── */

const Card = ({ icon: I, title, to, accent, children }: any) => (
  <Link to={to ?? '#'} className="group rounded-xl border border-border bg-surface p-3 transition-all hover:border-primary/60 hover:shadow-md"
        data-testid={`feature-card-${title.toLowerCase().replace(/\s+/g, '-')}`}>
    <div className="mb-2 flex items-center gap-2">
      <div className={`grid h-7 w-7 place-items-center rounded-md ${accent ?? 'bg-primary/15 text-primary'}`}>
        <I className="h-3.5 w-3.5" />
      </div>
      <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
      <ArrowRight className="ml-auto h-3.5 w-3.5 text-text-muted opacity-0 transition-opacity group-hover:opacity-100" />
    </div>
    {children}
  </Link>
);

const Stat = ({ label, value, tone }: { label: string; value: string | number; tone?: string }) => (
  <div className="flex items-baseline justify-between text-[12px]">
    <span className="text-text-muted">{label}</span>
    <span className={`font-semibold ${tone ?? 'text-text-primary'}`}>{value}</span>
  </div>
);

const SevBar = ({ map }: { map: Record<string, number> }) => {
  const entries = Object.entries(map ?? {});
  if (entries.length === 0)
    return <div className="text-[11px] italic text-text-muted">none</div>;
  return (
    <div className="flex flex-wrap gap-1">
      {entries.map(([k, n]) => (
        <span key={k} className={`rounded px-1.5 py-0.5 text-[10px] font-mono ${sevTone(k)}`}>
          {k.toLowerCase()} · {n}
        </span>
      ))}
    </div>
  );
};

const WorkspaceBadge = ({ meta }: { meta: FeatureSummaryResponse['workspace'] }) => (
  <div className="flex items-center gap-2 rounded-full border border-border bg-elevated px-3 py-1 text-xs"
       data-testid="feature-summary-workspace-badge">
    <Globe className="h-3.5 w-3.5 text-primary" />
    <span className="font-medium text-text-primary">{meta?.name ?? 'Workspace'}</span>
    {meta?.totalMembers ? (
      <span className="flex items-center gap-1 border-l border-border pl-2 text-text-muted">
        <Users className="h-3 w-3" /> {meta.totalMembers}
      </span>
    ) : null}
  </div>
);

const AiTestingCard = ({ d, ws }: any) => (
  <Card icon={FlaskConical} title="AI Testing" to="/projects/ai-testing?view=overview"
        accent="bg-violet-500/15 text-violet-600 dark:text-violet-300">
    <div className="mb-2 flex items-baseline gap-2">
      <span className="text-2xl font-bold leading-none">{fmt(d.totalRuns)}</span>
      <span className="text-[11px] text-text-muted">total runs</span>
    </div>
    <div className="space-y-1">
      <Stat label="Suites" value={fmt(d.suites)} />
      <Stat label="Test cases" value={fmt(d.cases)} />
      <Stat label="Last 7d runs" value={fmt(d.runsLast7d)} />
      <Stat label="Pass rate (7d)" value={fmtPct(d.passRateLast7d)}
            tone={d.passRateLast7d >= 0.8 ? 'text-emerald-600' : d.passRateLast7d > 0 ? 'text-amber-600' : 'text-text-secondary'} />
      <Stat label="LLM spend" value={fmtUsd(d.totalCostUsd)} tone="text-orange-600" />
    </div>
    {d.topModels?.length > 0 && (
      <div className="mt-2 border-t border-border/60 pt-2 text-[11px] text-text-muted">
        Top model: <span className="font-mono text-text-secondary">{d.topModels[0].key}</span>
      </div>
    )}
  </Card>
);

const BugTrackerCard = ({ d, ws }: any) => (
  <Card icon={Bug} title="Bug Tracker" to={`/projects/functional-tests?view=bugs${ws ? `&workspaceId=${ws}` : ''}`}
        accent="bg-red-500/15 text-red-600 dark:text-red-300">
    <div className="mb-2 flex items-baseline gap-2">
      <span className="text-2xl font-bold leading-none">{fmt(d.open)}</span>
      <span className="text-[11px] text-text-muted">open / {fmt(d.total)} total</span>
    </div>
    <div className="space-y-1">
      <Stat label="Closed" value={fmt(d.closed)} tone="text-emerald-600" />
      <Stat label="Last reported" value={fmtRel(d.lastReportedAt)} />
    </div>
    <div className="mt-2 border-t border-border/60 pt-2">
      <SevBar map={d.bySeverity} />
    </div>
  </Card>
);

const TestSpecsCard = ({ d, ws }: any) => (
  <Card icon={FileCode2} title="Test Specs" to={`/projects/test-specs${ws ? `?workspaceId=${ws}` : ''}`}
        accent="bg-sky-500/15 text-sky-600 dark:text-sky-300">
    <div className="mb-2 flex items-baseline gap-2">
      <span className="text-2xl font-bold leading-none">{fmt(d.total)}</span>
      <span className="text-[11px] text-text-muted">specs · {fmt(d.active)} active</span>
    </div>
    <div className="space-y-1">
      <Stat label="Last import" value={fmtRel(d.lastImportAt)} />
    </div>
    {Object.keys(d.byFormat ?? {}).length > 0 && (
      <div className="mt-2 flex flex-wrap gap-1 border-t border-border/60 pt-2">
        {Object.entries(d.byFormat).map(([k, n]: any) => (
          <span key={k} className="rounded bg-elevated px-1.5 py-0.5 font-mono text-[10px] text-text-secondary">
            {k}·{n}
          </span>
        ))}
      </div>
    )}
  </Card>
);

const WebhooksCard = ({ d, ws }: any) => (
  <Card icon={Webhook} title="Webhooks" to="/projects/ai-testing?view=webhooks"
        accent="bg-indigo-500/15 text-indigo-600 dark:text-indigo-300">
    <div className="mb-2 flex items-baseline gap-2">
      <span className="text-2xl font-bold leading-none">{fmt(d.active)}</span>
      <span className="text-[11px] text-text-muted">active / {fmt(d.total)} total</span>
    </div>
    <div className="space-y-1">
      <Stat label="Deliveries (7d)" value={fmt(d.deliveriesLast7d)} />
      <Stat label="Success rate" value={fmtPct(d.successRateLast7d)}
            tone={d.successRateLast7d >= 0.95 ? 'text-emerald-600' : 'text-amber-600'} />
      <Stat label="Last delivery" value={fmtRel(d.lastDeliveryAt)} />
    </div>
  </Card>
);

const MonitorsCard = ({ d, ws }: any) => (
  <Card icon={Activity} title="Monitors" to="/projects/monitors"
        accent="bg-emerald-500/15 text-emerald-600 dark:text-emerald-300">
    <div className="mb-2 flex items-baseline gap-2">
      <span className="text-2xl font-bold leading-none">{fmt(d.active)}</span>
      <span className="text-[11px] text-text-muted">active / {fmt(d.total)} · {fmt(d.paused)} paused</span>
    </div>
    <div className="space-y-1">
      <Stat label="Runs (7d)" value={fmt(d.runsLast7d)} />
      <Stat label="Open incidents" value={fmt(d.openIncidents)}
            tone={d.openIncidents > 0 ? 'text-red-600' : 'text-emerald-600'} />
      <Stat label="Last run" value={fmtRel(d.lastRunAt)} />
    </div>
  </Card>
);

const MocksCard = ({ d, ws }: any) => (
  <Card icon={ServerCog} title="Mock Servers" to="/projects/mocks"
        accent="bg-cyan-500/15 text-cyan-600 dark:text-cyan-300">
    <div className="mb-2 flex items-baseline gap-2">
      <span className="text-2xl font-bold leading-none">{fmt(d.active)}</span>
      <span className="text-[11px] text-text-muted">active / {fmt(d.total)} total</span>
    </div>
    <div className="space-y-1">
      <Stat label="Hits (7d)" value={fmt(d.hitsLast7d)} />
    </div>
  </Card>
);

const LoadTestsCard = ({ d, ws }: any) => (
  <Card icon={Gauge} title="Load Tests" to="/projects/load-tests"
        accent="bg-amber-500/15 text-amber-600 dark:text-amber-300">
    <div className="mb-2 flex items-baseline gap-2">
      <span className="text-2xl font-bold leading-none">{fmt(d.totalRuns)}</span>
      <span className="text-[11px] text-text-muted">total runs</span>
    </div>
    <div className="space-y-1">
      <Stat label="Runs (7d)" value={fmt(d.runsLast7d)} />
      <Stat label="Last run" value={fmtRel(d.lastRunAt)} />
    </div>
  </Card>
);

const SecurityCard = ({ d, ws }: any) => (
  <Card icon={Shield} title="Security" to="/projects/security"
        accent="bg-rose-500/15 text-rose-600 dark:text-rose-300">
    <div className="mb-2 flex items-baseline gap-2">
      <span className="text-2xl font-bold leading-none">{fmt(d.openFindings)}</span>
      <span className="text-[11px] text-text-muted">open / {fmt(d.totalFindings)} findings</span>
    </div>
    <div className="mt-2 border-t border-border/60 pt-2">
      <SevBar map={d.bySeverity} />
    </div>
  </Card>
);

const RequestsCard = ({ d, ws }: any) => (
  <Card icon={Globe} title="Requests" to={`/requests${ws ? `?workspaceId=${ws}` : ''}`}
        accent="bg-blue-500/15 text-blue-600 dark:text-blue-300">
    <div className="mb-2 flex items-baseline gap-2">
      <span className="text-2xl font-bold leading-none">{fmt(d.savedRequests)}</span>
      <span className="text-[11px] text-text-muted">saved · {fmt(d.collections)} collections</span>
    </div>
    <div className="space-y-1">
      <Stat label="Executions (7d)" value={fmt(d.executionsLast7d)} />
      <Stat label="Last run" value={fmtRel(d.lastRunAt)} />
    </div>
    {Object.entries(d.methodMix ?? {}).filter(([, n]: any) => n > 0).length > 0 && (
      <div className="mt-2 flex flex-wrap gap-1 border-t border-border/60 pt-2">
        {Object.entries(d.methodMix)
          .filter(([, n]: any) => n > 0)
          .sort((a: any, b: any) => b[1] - a[1])
          .slice(0, 4)
          .map(([k, n]: any) => (
            <span key={k} className="rounded bg-elevated px-1.5 py-0.5 font-mono text-[10px] text-text-secondary">
              {k}·{n}
            </span>
          ))}
      </div>
    )}
  </Card>
);

const ChatAgentsCard = ({ d, ws }: any) => (
  <Card icon={MessageSquare} title="AI Chat & Agents" to="/projects/ai-assistant"
        accent="bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-300">
    <div className="mb-2 flex items-baseline gap-2">
      <span className="text-2xl font-bold leading-none">{fmt(d.aiSessions)}</span>
      <span className="text-[11px] text-text-muted">chat sessions</span>
    </div>
    <div className="space-y-1">
      <Stat label="Agent configs" value={fmt(d.aiAgentConfigs)} />
      <Stat label="MCP servers" value={fmt(d.mcpServers)} />
      <Stat label="MCP calls (7d)" value={fmt(d.mcpCallsLast7d)} />
      <Stat label="Last chat" value={fmtRel(d.lastChatAt)} />
    </div>
  </Card>
);

const NotificationsCard = ({ d }: any) => (
  <Card icon={BellRing} title="Notifications" to="/projects/notifications"
        accent="bg-yellow-500/15 text-yellow-600 dark:text-yellow-300">
    <div className="mb-2 flex items-baseline gap-2">
      <span className="text-2xl font-bold leading-none">{fmt(d.unread)}</span>
      <span className="text-[11px] text-text-muted">unread / {fmt(d.total)} total</span>
    </div>
    <div className="space-y-1">
      <Stat label="Status" value={d.unread > 0 ? 'pending action' : 'all clear'}
            tone={d.unread > 0 ? 'text-orange-600' : 'text-emerald-600'} />
    </div>
  </Card>
);

const SectionSkeleton = () => (
  <section className="space-y-3" data-testid="feature-summary-skeleton">
    <div className="h-5 w-48 animate-pulse rounded bg-elevated" />
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 11 }).map((_, i) => (
        <div key={i} className="h-32 animate-pulse rounded-xl border border-border bg-surface" />
      ))}
    </div>
  </section>
);
