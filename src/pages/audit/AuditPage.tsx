/**
 * AuditPage — project-scoped activity timeline backed by
 * `forgeq-audit-activity-svc` on port 8088.
 *
 * Surface design takes cues from BetterStack and Linear's audit drawers:
 *   • Compact, dense rows with a vertical timeline rail and severity dot.
 *   • Filter bar (action, severity, resource, actor, date) all driven from
 *     the same Java timeline endpoint via CSV query params.
 *   • Click a row to open an inline detail flyout with before/after JSON
 *     diff (the Java service returns these fields when `includeDiff=true`).
 */
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ClipboardList, Filter, RefreshCw, Loader2, Search, ChevronRight, Eye,
  EyeOff, AlertTriangle, AlertCircle, Info, ShieldAlert, User, Server,
  Clock, X, ArrowDownRight, Sparkles, Link2, Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { NoProjectEmpty } from '@/components/common/NoProjectEmpty';
import { Skeleton } from '@/components/ui/Skeleton';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { timelineWorkspace, correlationChain, type TimelineEntry } from '@/services/audit.service';
import { fetchAuditInsight, type InsightResponse } from '@/api/audit-insight.api';
import { useAuditStream } from '@/hooks/useAuditStream';
import { cn } from '@/utils/cn';

const SEVERITIES = ['INFO', 'WARN', 'ERROR', 'CRITICAL'] as const;
type Severity = typeof SEVERITIES[number];

const SEVERITY_TONE: Record<string, { dot: string; pill: string; icon: any }> = {
  INFO:     { dot: 'bg-primary',         pill: 'border-primary/30 bg-primary/10 text-primary',           icon: Info },
  WARN:     { dot: 'bg-warning',         pill: 'border-warning/30 bg-warning/10 text-warning',           icon: AlertTriangle },
  ERROR:    { dot: 'bg-danger',          pill: 'border-danger/30 bg-danger/10 text-danger',              icon: AlertCircle },
  CRITICAL: { dot: 'bg-fuchsia-500',     pill: 'border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-400', icon: ShieldAlert },
};

const RESOURCES = ['workspace', 'collection', 'request', 'environment', 'mock', 'monitor', 'apiDoc', 'testSpec', 'functionalTest', 'loadTest'];

const fmtRelative = (iso?: string | number | null): string => {
  if (!iso) return '—';
  try {
    const t = new Date(iso).getTime();
    const diff = Date.now() - t;
    if (diff < 60_000) return `${Math.max(1, Math.floor(diff / 1000))}s ago`;
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch { return '—'; }
};

const fmtAbsolute = (iso?: string | number | null): string => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString(); } catch { return '—'; }
};

export const AuditPage = () => {
  const ws = useWorkspaceStore((s) => s.current);

  const [search, setSearch] = useState('');
  const [actorEmail, setActorEmail] = useState('');
  const [severities, setSeverities] = useState<Set<Severity>>(new Set());
  const [resources, setResources] = useState<Set<string>>(new Set());
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [includeDiff, setIncludeDiff] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState(50);
  const [drawerEvent, setDrawerEvent] = useState<TimelineEntry | null>(null);

  const filterParams = useMemo(() => ({
    severities: severities.size ? Array.from(severities).join(',') : undefined,
    resources:  resources.size  ? Array.from(resources).join(',')  : undefined,
    actorEmail: actorEmail.trim() || undefined,
    from: from || undefined,
    to:   to   || undefined,
    includeDiff,
    size: pageSize,
  }), [severities, resources, actorEmail, from, to, includeDiff, pageSize]);

  const q = useQuery({
    queryKey: ['audit', 'workspace', ws?.id, filterParams],
    queryFn: () => timelineWorkspace(ws!.id, filterParams),
    enabled: !!ws?.id,
    refetchInterval: 30_000, // safety net — SSE is the primary path
  });

  // Live event stream (Java SSE) — pushes new entries into the cache so
  // the timeline updates in real time without aggressive polling.
  useAuditStream(ws?.id);

  const items = q.data?.items ?? [];
  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const k = search.trim().toLowerCase();
    return items.filter((e) =>
      (e.action ?? '').toLowerCase().includes(k) ||
      (e.actorEmail ?? '').toLowerCase().includes(k) ||
      (e.endpoint ?? '').toLowerCase().includes(k) ||
      (e.resourceId ?? '').toLowerCase().includes(k) ||
      (e.resource ?? '').toLowerCase().includes(k),
    );
  }, [items, search]);

  if (!ws) {
    return (
      <NoProjectEmpty testId="audit-no-workspace" icon="audit" surface="the audit log" />
    );
  }

  const toggleSet = <T extends string>(set: Set<T>, key: T, setter: (s: Set<T>) => void) => {
    const next = new Set(set);
    next.has(key) ? next.delete(key) : next.add(key);
    setter(next);
  };

  const totalEvents = q.data?.total ?? 0;
  const errCount = items.filter((e) => e.severity === 'ERROR' || e.severity === 'CRITICAL').length;
  const actorCount = new Set(items.map((e) => e.actorEmail).filter(Boolean)).size;

  return (
    <div className="flex h-full flex-col" data-testid="audit-page">
      {/* Header */}
      <header className="flex flex-wrap items-center gap-2 border-b border-border bg-surface/40 px-6 py-3">
        <h1 className="flex items-center gap-2 text-base font-semibold tracking-tight">
          <ClipboardList className="h-4 w-4 text-primary" /> Audit log
        </h1>
        <span className="text-[11px] text-text-muted">
          · Who did what, when — across every workspace, in real time.
        </span>
        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
            <input
              data-testid="audit-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search action, actor, endpoint…"
              className="h-8 w-72 rounded-md border border-border bg-probestack-bg pl-7 pr-2 text-xs"
            />
          </div>
          <Button size="sm" variant="ghost" onClick={() => q.refetch()} data-testid="audit-refresh">
            <RefreshCw className={cn('h-3.5 w-3.5', q.isFetching && 'animate-spin')} />
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-hidden">
        <div className="mx-auto h-full max-w-7xl px-6 py-6">
          <div className="flex h-full flex-col gap-4">
            {/* KPI tiles */}
            <section className="grid gap-3 sm:grid-cols-3" data-testid="audit-kpis">
              <Tile label="Total events"    value={totalEvents} icon={ClipboardList} testId="audit-kpi-total" />
              <Tile label="Error / critical" value={errCount}    icon={AlertCircle}    tone="danger"  testId="audit-kpi-err" />
              <Tile label="Active actors"   value={actorCount}  icon={User}           tone="primary" testId="audit-kpi-actors" />
            </section>

            {/* AI weekly insight card */}
            <AiInsightCard items={items} workspaceId={ws.id} workspaceName={ws.name} />

            {/* Filters */}
            <section
              data-testid="audit-filters"
              className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-surface/40 p-3"
            >
              <span className="flex items-center gap-1 px-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                <Filter className="h-3 w-3" /> Filters
              </span>
              {/* Severity pills */}
              {SEVERITIES.map((s) => {
                const on = severities.has(s);
                const tone = SEVERITY_TONE[s];
                return (
                  <button
                    key={s}
                    data-testid={`audit-sev-${s.toLowerCase()}`}
                    onClick={() => toggleSet(severities, s, setSeverities)}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider transition-colors',
                      on ? tone.pill : 'border-border bg-elevated text-text-muted hover:text-text-primary',
                    )}
                  >
                    <span className={cn('h-1.5 w-1.5 rounded-full', tone.dot)} /> {s}
                  </button>
                );
              })}
              <span className="mx-1 h-4 w-px bg-border" />
              <select
                data-testid="audit-resource-filter"
                value={Array.from(resources)[0] ?? ''}
                onChange={(e) => {
                  const v = e.target.value;
                  setResources(v ? new Set([v]) : new Set());
                }}
                className="h-7 rounded-md border border-border bg-probestack-bg px-2 text-[11px]"
              >
                <option value="">Any resource</option>
                {RESOURCES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              <input
                data-testid="audit-actor-filter"
                value={actorEmail}
                onChange={(e) => setActorEmail(e.target.value)}
                placeholder="Actor email…"
                className="h-7 w-48 rounded-md border border-border bg-probestack-bg px-2 text-[11px]"
              />
              <input
                type="date"
                data-testid="audit-from"
                value={from.slice(0, 10)}
                onChange={(e) => setFrom(e.target.value ? new Date(e.target.value).toISOString() : '')}
                className="h-7 rounded-md border border-border bg-probestack-bg px-2 text-[11px]"
              />
              <span className="text-[10px] text-text-muted">→</span>
              <input
                type="date"
                data-testid="audit-to"
                value={to.slice(0, 10)}
                onChange={(e) => setTo(e.target.value ? new Date(e.target.value).toISOString() : '')}
                className="h-7 rounded-md border border-border bg-probestack-bg px-2 text-[11px]"
              />
              <button
                data-testid="audit-toggle-diff"
                onClick={() => setIncludeDiff((v) => !v)}
                className={cn(
                  'inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-medium transition-colors',
                  includeDiff
                    ? 'border-primary/30 bg-primary/10 text-primary'
                    : 'border-border bg-elevated text-text-muted hover:text-text-primary',
                )}
              >
                {includeDiff ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                Include diff
              </button>
              {(severities.size > 0 || resources.size > 0 || actorEmail || from || to) && (
                <button
                  data-testid="audit-clear-filters"
                  onClick={() => { setSeverities(new Set()); setResources(new Set()); setActorEmail(''); setFrom(''); setTo(''); }}
                  className="ml-auto inline-flex items-center gap-1 rounded-md border border-border bg-probestack-bg px-2 py-1 text-[10px] font-medium text-text-secondary hover:text-text-primary"
                >
                  <X className="h-3 w-3" /> Clear
                </button>
              )}
            </section>

            {/* Timeline */}
            <section className="flex-1 overflow-hidden rounded-2xl border border-border bg-surface/30">
              <div className="flex h-full flex-col">
                <div className="flex items-center gap-2 border-b border-border bg-surface/50 px-4 py-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted">Timeline</h3>
                  <span className="text-[10px] text-text-muted">{filtered.length} of {items.length} loaded</span>
                  {q.isFetching && <Loader2 className="h-3 w-3 animate-spin text-text-muted" />}
                </div>
                <div className="flex-1 overflow-auto" data-testid="audit-timeline">
                  {q.isLoading ? (
                    <div className="space-y-2 p-4">
                      {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
                    </div>
                  ) : filtered.length === 0 ? (
                    <EmptyState filtered={items.length > 0} />
                  ) : (
                    <ol className="relative">
                      {/* Vertical rail */}
                      <span aria-hidden className="absolute bottom-3 left-[27px] top-3 w-px bg-border" />
                      {filtered.map((e) => (
                        <TimelineRow
                          key={e.eventId}
                          entry={e}
                          isOpen={openId === e.eventId}
                          onToggle={() => setOpenId(openId === e.eventId ? null : e.eventId)}
                          onShowChain={() => setDrawerEvent(e)}
                        />
                      ))}
                      {/* Load more — bumps in-memory page size; backend
                           returns up to 100 per page so we step by 50 each
                           click. */}
                      {totalEvents > items.length && (
                        <li className="flex items-center justify-center p-4">
                          <Button
                            size="sm"
                            variant="outline"
                            data-testid="audit-load-more"
                            onClick={() => setPageSize((s) => Math.min(s + 50, 500))}
                            disabled={q.isFetching}
                          >
                            {q.isFetching
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              : <Plus className="h-3.5 w-3.5" />}
                            Load more events ({items.length} of {totalEvents})
                          </Button>
                        </li>
                      )}
                    </ol>
                  )}
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
      {drawerEvent && (
        <CorrelationDrawer
          event={drawerEvent}
          onClose={() => setDrawerEvent(null)}
        />
      )}
    </div>
  );
};

const TimelineRow = ({ entry: e, isOpen, onToggle, onShowChain }: {
  entry: TimelineEntry; isOpen: boolean; onToggle: () => void; onShowChain: () => void;
}) => {
  const tone = SEVERITY_TONE[(e.severity ?? 'INFO') as string] ?? SEVERITY_TONE.INFO;
  const Icon = tone.icon;
  return (
    <li
      data-testid={`audit-row-${e.eventId}`}
      className={cn('group relative border-b border-border/50 last:border-b-0', isOpen && 'bg-surface/40')}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-hover/40"
      >
        {/* Severity dot on the rail */}
        <span className="relative z-10 mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border border-border bg-surface">
          <span className={cn('h-2 w-2 rounded-full', tone.dot)} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-[11px] font-semibold tracking-tight text-text-primary" data-testid={`audit-row-action-${e.eventId}`}>
              {e.action || 'unknown.action'}
            </span>
            <span className={cn('inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider', tone.pill)}>
              <Icon className="h-2.5 w-2.5" /> {e.severity ?? 'INFO'}
            </span>
            {e.resource && (
              <span className="rounded border border-border bg-elevated px-1.5 py-0.5 font-mono text-[9px] text-text-muted">
                {e.resource}
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-text-muted">
            <span className="inline-flex items-center gap-1">
              <User className="h-2.5 w-2.5" /> {e.actorEmail ?? 'system'}
            </span>
            <span className="inline-flex items-center gap-1" title={fmtAbsolute(e.timestamp)}>
              <Clock className="h-2.5 w-2.5" /> {fmtRelative(e.timestamp)}
            </span>
          </div>
        </div>
        <ChevronRight className={cn('mt-1 h-3.5 w-3.5 shrink-0 text-text-muted transition-transform', isOpen && 'rotate-90')} />
      </button>

      {isOpen && (
        <div className="border-t border-border bg-probestack-bg/50 px-4 py-3" data-testid={`audit-row-detail-${e.eventId}`}>
          <DetailGrid entry={e} />
        </div>
      )}
    </li>
  );
};

const DetailGrid = ({ entry: e }: { entry: TimelineEntry }) => (
  <div className="grid gap-3 lg:grid-cols-2">
    <dl className="space-y-1.5 text-[11px]">
      <KV k="Actor">{e.actorEmail ?? '—'}{e.actorName ? ` (${e.actorName})` : ''}</KV>
      <KV k="When">{fmtAbsolute(e.timestamp)}</KV>
      {(e.tags ?? []).length > 0 && (
        <KV k="Tags">
          <span className="flex flex-wrap gap-1">
            {(e.tags ?? []).map((t) => (
              <span key={t} className="rounded border border-border bg-elevated px-1.5 py-0.5 font-mono text-[9px] text-text-secondary">{t}</span>
            ))}
          </span>
        </KV>
      )}
    </dl>
    {(e.before || e.after) ? (
      <div className="grid gap-2">
        {e.before && (
          <div>
            <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
              <ArrowDownRight className="h-3 w-3" /> Before
            </div>
            <pre className="max-h-48 overflow-auto rounded-lg border border-border bg-elevated p-3 font-mono text-[10px] leading-relaxed text-text-secondary">
              {JSON.stringify(e.before, null, 2)}
            </pre>
          </div>
        )}
        {e.after && (
          <div>
            <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
              <ArrowDownRight className="h-3 w-3" /> After
            </div>
            <pre className="max-h-48 overflow-auto rounded-lg border border-border bg-elevated p-3 font-mono text-[10px] leading-relaxed text-text-secondary">
              {JSON.stringify(e.after, null, 2)}
            </pre>
          </div>
        )}
      </div>
    ) : (
      <p className="self-start text-[10px] text-text-muted">No diff captured for this event. Toggle <strong>Include diff</strong> on read-modify actions to see snapshots.</p>
    )}
  </div>
);

const KV = ({ k, children }: { k: string; children: React.ReactNode }) => (
  <div className="grid grid-cols-[110px_1fr] gap-2 text-[11px]">
    <dt className="text-text-muted">{k}</dt>
    <dd className="break-all font-mono text-text-secondary">{children}</dd>
  </div>
);

const Tile = ({ icon: Icon, label, value, tone = 'default', testId }: {
  icon: any; label: string; value: number | string; tone?: 'default' | 'primary' | 'danger'; testId: string;
}) => {
  const tones: Record<string, string> = {
    default: 'text-text-primary',
    primary: 'text-primary',
    danger:  'text-danger',
  };
  return (
    <div data-testid={testId} className="rounded-2xl border border-border bg-surface/40 p-4">
      <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className={cn('text-2xl font-semibold tracking-tight', tones[tone])}>{value}</div>
    </div>
  );
};

const EmptyState = ({ filtered }: { filtered: boolean }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center" data-testid="audit-empty">
    <ClipboardList className="mb-3 h-10 w-10 text-text-muted" />
    <p className="text-sm font-semibold">{filtered ? 'No events match your filters' : 'No activity yet'}</p>
    <p className="mt-1 max-w-md text-xs text-text-muted">
      {filtered
        ? 'Loosen the filters or clear them to see everything.'
        : 'As your team creates collections, runs requests, and edits environments, every action will land here in real time.'}
    </p>
  </div>
);

/* ─────────────── AI Insight card ──────────────────────────────────── */

const AiInsightCard = ({ items, workspaceId: wsId, workspaceName }: {
  items: TimelineEntry[]; workspaceId: string; workspaceName?: string;
}) => {
  const [insight, setInsight] = useState<InsightResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const onSummarise = async () => {
    setLoading(true); setError(null);
    try {
      const sample = items.slice(0, 60).map((e) => ({
        action: e.action, actorEmail: e.actorEmail, resource: e.resource,
        severity: e.severity, statusCode: e.statusCode, timestamp: e.timestamp,
      }));
      const r = await fetchAuditInsight(wsId, sample, workspaceName);
      setInsight(r);
      setExpanded(true);
    } catch (e: any) {
      setError(e?.message ?? 'AI summary failed');
    } finally { setLoading(false); }
  };

  return (
    <section
      data-testid="audit-insight-card"
      className="overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/[0.06] via-transparent to-fuchsia-500/[0.04] p-4"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-primary/15 text-primary">
          <Sparkles className="h-4 w-4" />
        </span>
        <div>
          <h3 className="text-sm font-semibold tracking-tight">What changed recently</h3>
          <p className="text-[11px] text-text-muted">AI summary of the loaded audit window — Claude Sonnet 4.5</p>
        </div>
        <span className="ml-auto" />
        <Button
          size="sm"
          variant={insight ? 'outline' : 'primary'}
          onClick={onSummarise}
          disabled={loading || items.length === 0}
          data-testid="audit-insight-run"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {loading ? 'Summarising…' : insight ? 'Re-summarise' : `Summarise ${items.length} events`}
        </Button>
      </div>

      {error && (
        <p className="mt-3 rounded-md border border-danger/30 bg-danger/10 p-2 text-[11px] text-danger" data-testid="audit-insight-error">
          {error}
        </p>
      )}

      {insight && expanded && (
        <div className="mt-3 grid gap-3 lg:grid-cols-[2fr_1fr]" data-testid="audit-insight-body">
          <div>
            <p className="text-sm leading-relaxed text-text-primary" data-testid="audit-insight-summary">
              {insight.summary}
            </p>
            {insight.highlights.length > 0 && (
              <ul className="mt-2 space-y-1" data-testid="audit-insight-highlights">
                {insight.highlights.map((h, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-[12px] text-text-secondary">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                    {h}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="space-y-2">
            <div className="rounded-lg border border-border bg-surface/40 p-3">
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted">Top actors</p>
              {insight.actorTop.length === 0
                ? <p className="text-[11px] text-text-muted">— system only —</p>
                : (
                  <ul className="space-y-1">
                    {insight.actorTop.map((a) => (
                      <li key={a.email} className="flex items-center justify-between text-[11px]">
                        <span className="truncate font-mono text-text-secondary">{a.email}</span>
                        <span className="rounded bg-elevated px-1.5 py-0.5 font-mono text-[10px] text-text-muted">{a.count}</span>
                      </li>
                    ))}
                  </ul>
                )
              }
            </div>
            <div className="rounded-lg border border-border bg-surface/40 p-3">
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted">Severity</p>
              <ul className="space-y-1">
                {Object.entries(insight.severityCounts).map(([k, v]) => {
                  const t = SEVERITY_TONE[k] ?? SEVERITY_TONE.INFO;
                  return (
                    <li key={k} className="flex items-center justify-between text-[11px]">
                      <span className="inline-flex items-center gap-1.5">
                        <span className={cn('h-1.5 w-1.5 rounded-full', t.dot)} /> {k}
                      </span>
                      <span className="rounded bg-elevated px-1.5 py-0.5 font-mono text-[10px] text-text-muted">{v}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

/* ─────────────── Correlation chain drawer ─────────────────────────── */

const CorrelationDrawer = ({ event, onClose }: { event: TimelineEntry; onClose: () => void }) => {
  const cid = (event as any).correlationId as string | undefined;
  const q = useQuery({
    queryKey: ['audit-chain', cid],
    queryFn: () => correlationChain(cid!),
    enabled: !!cid,
    retry: false,
  });

  return (
    <div data-testid="audit-chain-drawer" className="fixed inset-0 z-40 flex justify-end bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-md flex-col border-l border-border bg-surface shadow-2xl"
      >
        <header className="flex items-center gap-2 border-b border-border bg-surface/80 px-4 py-3">
          <Link2 className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold tracking-tight">Correlation chain</h2>
          <button onClick={onClose} data-testid="audit-chain-close" className="ml-auto rounded p-1 text-text-muted hover:bg-hover hover:text-text-primary">
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="border-b border-border px-4 py-2 text-[11px] text-text-muted">
          {cid
            ? <>Anchor event <code className="rounded bg-elevated px-1 font-mono">{event.eventId.slice(0, 8)}</code> · correlation id <code className="rounded bg-elevated px-1 font-mono">{cid.slice(0, 8)}</code></>
            : <>This event has no correlation id; nothing to chain.</>
          }
        </div>
        <div className="flex-1 overflow-auto p-3" data-testid="audit-chain-body">
          {!cid ? (
            <p className="rounded-md border border-dashed border-border bg-surface/40 p-4 text-center text-[11px] text-text-muted">
              Correlation chains link events that originated from the same incoming request.
              Heartbeat-only or system events typically don&rsquo;t have one.
            </p>
          ) : q.isLoading ? (
            <Loader2 className="mx-auto mt-8 h-5 w-5 animate-spin text-text-muted" />
          ) : q.isError ? (
            <p className="text-[11px] text-danger">Failed to load chain: {(q.error as Error)?.message}</p>
          ) : (q.data ?? []).length === 0 ? (
            <p className="text-[11px] text-text-muted">No related events found.</p>
          ) : (
            <ol className="relative space-y-2">
              <span aria-hidden className="absolute bottom-3 left-[14px] top-3 w-px bg-border" />
              {(q.data ?? []).map((c) => {
                const tone = SEVERITY_TONE[(c.severity ?? 'INFO') as string] ?? SEVERITY_TONE.INFO;
                const Icon = tone.icon;
                const isAnchor = c.eventId === event.eventId;
                return (
                  <li key={c.eventId} data-testid={`audit-chain-row-${c.eventId}`}
                    className={cn('relative flex items-start gap-2 rounded-md border p-2 text-[11px]',
                      isAnchor ? 'border-primary/40 bg-primary/[0.06]' : 'border-border bg-surface/40')}>
                    <span className={cn('grid h-7 w-7 shrink-0 place-items-center rounded-full ring-1', tone.pill)}>
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate font-mono font-semibold text-text-primary">{c.action}</span>
                        {c.statusCode != null && (
                          <span className={cn('rounded border px-1 py-0.5 font-mono text-[9px]',
                            c.statusCode < 400 ? 'border-success/30 bg-success/10 text-success' : 'border-danger/30 bg-danger/10 text-danger')}>
                            {c.statusCode}
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex flex-wrap gap-1.5 text-[10px] text-text-muted">
                        <span>{c.actorEmail ?? 'system'}</span>
                        {c.service && <span>· {c.service}</span>}
                        <span>· {fmtRelative(c.timestamp as any)}</span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuditPage;
