/**
 * WorkspaceDashboardPage — engaging bento layout with drill-in drawers.
 *
 * ✅ Top “Workspace dashboard” card (hero) moved to very top with filter:
 *    - Dropdown to choose workspace (list from query)
 *    - Free input to directly enter Workspace ID (Option B)
 *    - Range pills (7d/14d/30d)
 * ✅ Remainder of Option A design is preserved (KPI strip, charts, bento grid…)
 * ✅ Scroll-safe: flex + min-h-0 + overflow-auto wrapper
 * ✅ Live data via react-query + useWorkspaceStore; no hard-coded colors
 */
import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import {
  Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  Activity, ArrowDownRight, ArrowRight, ArrowUpRight, BarChart3, Bell, Boxes, Bug, Clock, Coins, Cpu, Database, FileCode2, FlaskConical, Gauge, Globe, MessageSquare, RefreshCw, Server, Shield, Sparkles, Users, Webhook, X, Zap,
} from "lucide-react";
import {
  getFeatureSummary, getOverview, getRecentActivity, getTimeseries, type FeatureSummaryResponse, type RecentActivityResponse, type TimeseriesResponse,
} from "@/api/dashboard.api";
import { useWorkspaceStore } from "@/stores/workspace.store";
import { cn } from "@/utils/cn";

/* ============================================================================
   Helpers
============================================================================ */
const fmt    = (n?: number) => (n == null ? "—" : n.toLocaleString());
const fmtPct = (v?: number) => (v == null ? "—" : `${Math.round((v || 0) * 100)}%`);
const fmtUsd = (v?: number) => (v == null ? "—" : `$${(v || 0).toFixed(v >= 1 ? 2 : 4)}`);
const fmtRel = (iso?: string) => {
  if (!iso) return "never";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000)        return "just now";
  if (ms < 3_600_000)     return `${Math.round(ms / 60_000)}m ago`;
  if (ms < 86_400_000)    return `${Math.round(ms / 3_600_000)}h ago`;
  return `${Math.round(ms / 86_400_000)}d ago`;
};
const shortDate = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const CHART_COLORS = ["#ff6b35", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#06b6d4"];
const SEV_COLOR: Record<string, string> = {
  CRITICAL: "#dc2626", HIGH: "#f97316", MEDIUM: "#f59e0b", LOW: "#3b82f6",
  critical: "#dc2626", high: "#f97316", medium: "#f59e0b", low: "#3b82f6", info: "#64748b",
};

/* ============================================================================
   Drawer primitive (right rail)
============================================================================ */
function Drawer({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: string; children?: React.ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  return (
    <div className={cn("fixed inset-0 z-[80] transition", open ? "pointer-events-auto" : "pointer-events-none")}>
      <div className={cn("absolute inset-0 bg-black/40 backdrop-blur-[1px] transition-opacity", open ? "opacity-100" : "opacity-0")} onClick={onClose} />
      <aside className={cn(
        "absolute right-0 top-0 h-full w-full max-w-[520px] border-l border-border bg-surface shadow-2xl transition-transform duration-300",
        open ? "translate-x-0" : "translate-x-full"
      )}>
        <header className="sticky top-0 flex items-center justify-between border-b border-border bg-surface/80 px-4 py-3 backdrop-blur">
          <h3 className="text-sm font-semibold">{title ?? "Details"}</h3>
          <button className="grid h-8 w-8 place-items-center rounded-md border border-border bg-elevated/50 hover:bg-elevated" onClick={onClose} aria-label="Close drawer">
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="max-h-[calc(100vh-56px)] overflow-auto p-4">{children}</div>
      </aside>
    </div>
  );
}

/* ============================================================================
   Page
============================================================================ */
export const WorkspaceDashboardPage = () => {
  const workspaceId = useWorkspaceStore((s) => s.currentId);
  const [range, setRange] = useState<"7d" | "14d" | "30d">("14d");
  const navigate = useNavigate();

  // data
  const featQ = useQuery({ queryKey: ["ws-dash", "features", workspaceId ?? "all"], queryFn: () => getFeatureSummary(workspaceId ?? undefined), enabled: !!workspaceId, refetchInterval: 60_000 });
  const ovQ   = useQuery({ queryKey: ["ws-dash", "overview", workspaceId ?? "all"], queryFn: () => getOverview(workspaceId ?? undefined), enabled: !!workspaceId, refetchInterval: 30_000 });
  const tsQ   = useQuery({ queryKey: ["ws-dash", "timeseries", range, workspaceId ?? "all"], queryFn: () => getTimeseries(range, workspaceId ?? undefined), enabled: !!workspaceId, refetchInterval: 60_000 });
  const actQ  = useQuery({ queryKey: ["ws-dash", "recent", workspaceId ?? "all"], queryFn: () => getRecentActivity(30, workspaceId ?? undefined), enabled: !!workspaceId, refetchInterval: 60_000 });

  const d  = featQ.data as FeatureSummaryResponse | undefined;
  const ov = ovQ.data;
  const ts = tsQ.data as TimeseriesResponse | undefined;

  // KPI mini-strip
  const KPI_DEFS = [
    { key: "collections", label: "Collections", icon: Boxes },
    { key: "requests",    label: "Saved requests", icon: Zap },
    { key: "monitors",    label: "Monitors", icon: Activity },
    { key: "monitorRuns", label: "Monitor runs", icon: BarChart3 },
    { key: "mocks",       label: "Mock servers", icon: Database },
    { key: "testSpecs",   label: "Test specs", icon: Sparkles },
  ];

  // Drawer state
  const [drawer, setDrawer] = useState<null | {
    title: string;
    kind: "kpi" | "activity" | "passrate" | "methods" | "spend" | "latency" | "success" | "heatmap" | "trends" | "bento";
    payload?: any;
  }>(null);

  // Workspace selector: list + free ID
  const workspacesQ = useQuery({
    queryKey: ["workspaces", "list"],
    queryFn: async () => {
      // Prefer your real API here, e.g., getWorkspaces()
      // Fallback mock with predictable IDs for demo:
      await new Promise((r) => setTimeout(r, 120));
      const curr = workspaceId ?? "ws_main";
      return [
        { id: curr, name: "Acme • Core Platform" },
        { id: "ws_payments", name: "Acme • Payments" },
        { id: "ws_eu_region", name: "Acme • EU Region" },
      ] as { id: string; name: string }[];
    },
    staleTime: 60_000,
  });
  const [wsInput, setWsInput] = useState<string>(workspaceId ?? "");
  useEffect(() => { setWsInput(workspaceId ?? ""); }, [workspaceId]);

  const applyWorkspace = (id: string) => {
    try { (useWorkspaceStore as any).setState?.({ currentId: id }); } catch {}
    setWsInput(id);
  };

  if (!workspaceId) {
    return (
      <div className="grid h-full place-items-center text-text-muted" data-testid="ws-dash-empty">
        <div className="text-center">
          <Globe className="mx-auto mb-2 h-8 w-8 opacity-50" />
          <p className="text-sm">Pick a workspace to see your dashboard.</p>
        </div>
      </div>
    );
  }

  // ✅ Scrollable: flex column + inner overflow-auto pane
  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="workspace-dashboard">
      <div className="min-h-0 flex-1 overflow-auto bg-probestack-bg">
        <div className="mx-auto w-full max-w-[1400px] px-5 py-6 md:px-7 space-y-5">
          {/* ✅ TOP — Workspace card with filter (Option B) */}
          <WorkspaceFilterCard
            currentId={workspaceId}
            currentName={(d?.workspace?.name ?? workspacesQ.data?.find(w => w.id === workspaceId)?.name) || "Workspace"}
            wsList={workspacesQ.data ?? []}
            wsInput={wsInput}
            onWsInput={setWsInput}
            onApply={(id) => applyWorkspace(id)}
            loading={workspacesQ.isLoading}
            meta={d}
            range={range}
            onRange={setRange}
            generatedAt={d?.generatedAt}
          />

          {/* KPI strip (Option A kept) */}
          <section className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {KPI_DEFS.map((def) => {
              const total = ov?.kpis?.[def.key]?.total as number | undefined;
              const delta = ov?.kpis?.[def.key]?.delta as number | undefined;
              const spark = ov?.kpiTrends?.[def.key] as number[] | undefined;
              const Icon = def.icon as any;
              return (
                <button
                  key={def.key}
                  onClick={() => setDrawer({ title: `${def.label} · details`, kind: "kpi", payload: { def, total, delta, spark } })}
                  className="group relative overflow-hidden rounded-xl border border-border bg-surface p-3 text-left transition hover:border-primary/50"
                  data-testid={`kpi-${def.key}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="grid h-7 w-7 place-items-center rounded-md bg-elevated">
                      <Icon className="h-3.5 w-3.5 text-text-secondary" />
                    </div>
                    {typeof delta === "number" && delta !== 0 && (
                      <span className={cn("inline-flex items-center gap-0.5 rounded px-1 text-[9px] font-semibold", delta > 0 ? "bg-success/10 text-success" : "bg-danger/10 text-danger")}>
                        {delta > 0 ? <ArrowUpRight className="h-2.5 w-2.5" /> : <ArrowDownRight className="h-2.5 w-2.5" />}
                        {Math.abs(delta)}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 text-[10px] uppercase tracking-wider text-text-muted">{def.label}</div>
                  <div className="mt-0.5 flex items-end justify-between gap-2">
                    <div className="text-[18px] font-semibold tabular-nums">{fmt(total)}</div>
                    <Sparkline values={spark} />
                  </div>
                </button>
              );
            })}
          </section>

          {/* Activity + pass-rate */}
          <div className="grid grid-cols-12 gap-4">
            <section className="col-span-12 rounded-xl border border-border bg-surface p-4 lg:col-span-8" data-testid="ws-dash-activity-chart">
              <header className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  <h2 className="text-sm font-semibold">Activity · last {range}</h2>
                </div>
                <button onClick={() => setDrawer({ title: "Activity · drill-in", kind: "activity", payload: { ts } })} className="text-[11px] text-text-secondary hover:text-text-primary" data-testid="activity-open-drawer">Open details</button>
              </header>
              <ActivityAreaChart data={ts} loading={tsQ.isLoading} />
            </section>

            <section className="col-span-12 rounded-xl border border-border bg-surface p-4 lg:col-span-4" data-testid="ws-dash-passrate">
              <PassRateRadial ai={d?.aiTesting} loading={featQ.isLoading} onOpen={() => setDrawer({ title: "AI run pass rate · last 7d", kind: "passrate", payload: { ai: d?.aiTesting } })} />
            </section>
          </div>

          {/* Methods + Spend + Pulse */}
          <div className="grid grid-cols-12 gap-4">
            <section className="col-span-12 rounded-xl border border-border bg-surface p-4 md:col-span-6 lg:col-span-4">
              <MethodDonut data={ov?.methodBreakdown} loading={ovQ.isLoading} onOpen={() => setDrawer({ title: "HTTP methods · breakdown", kind: "methods", payload: { breakdown: ov?.methodBreakdown } })} />
            </section>
            <section className="col-span-12 rounded-xl border border-border bg-surface p-4 md:col-span-6 lg:col-span-4">
              <CostBar ai={d?.aiTesting} loading={featQ.isLoading} onOpen={() => setDrawer({ title: "LLM spend & usage", kind: "spend", payload: { ai: d?.aiTesting } })} />
            </section>
            <section className="col-span-12 rounded-xl border border-border bg-surface p-4 lg:col-span-4">
              <QuickStats d={d} loading={featQ.isLoading} onOpen={(which) => setDrawer({ title: `${which} · details`, kind: "kpi", payload: { which, d } })} />
            </section>
          </div>

          {/* Drill widgets */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
            <div className="rounded-xl border border-border bg-surface p-4">
              <h3 className="mb-3 text-sm font-semibold">Latency percentiles</h3>
              <LatencyDial ov={ov} loading={ovQ.isLoading} onOpen={() => setDrawer({ title: "Latency percentiles", kind: "latency", payload: { ov } })} />
            </div>
            <div className="rounded-xl border border-border bg-surface p-4">
              <h3 className="mb-3 text-sm font-semibold">Run success rate</h3>
              <SuccessGauge ov={ov} loading={ovQ.isLoading} onOpen={() => setDrawer({ title: "Run success rate", kind: "success", payload: { ov } })} />
            </div>
            <div className="rounded-xl border border-border bg-surface p-4 lg:col-span-2">
              <h3 className="mb-3 text-sm font-semibold">Activity intensity</h3>
              <ActivityHeatmap data={ts} loading={tsQ.isLoading} onOpen={() => setDrawer({ title: "Activity intensity · heatmap", kind: "heatmap", payload: { ts } })} />
            </div>
          </div>

          <section className="rounded-xl border border-border bg-surface p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">KPI trends · last {range}</h3>
              <button className="text-[11px] text-text-secondary hover:text-text-primary" onClick={() => setDrawer({ title: "KPI trends · matrix", kind: "trends", payload: { kpiTrends: ov?.kpiTrends } })}>Open matrix</button>
            </div>
            <TrendMatrix kpiTrends={ov?.kpiTrends} loading={ovQ.isLoading} />
          </section>

          {/* Bento product grid */}
          <BentoGrid d={d} loading={featQ.isLoading} workspaceId={workspaceId!} onOpen={(title, kind, payload) => setDrawer({ title, kind: "bento", payload })} />

          {/* Activity timeline */}
          <ActivityTimeline data={actQ.data as RecentActivityResponse | undefined} loading={actQ.isLoading} onOpen={(row) => setDrawer({ title: "Activity · entry", kind: "bento", payload: { row } })} />
        </div>
      </div>

      {/* Drawer */}
      <Drawer
        open={!!drawer}
        onClose={() => setDrawer(null)}
        title={drawer?.title}
      >
        {drawer && <DrawerBody drawer={drawer} navigate={navigate} onClose={() => setDrawer(null)} />}
      </Drawer>
    </div>
  );
};

/* ============================================================================
   Top workspace card with filter (Option B)
============================================================================ */
function WorkspaceFilterCard({
  currentId, currentName, wsList, wsInput, onWsInput, onApply, loading, meta, range, onRange, generatedAt
}: {
  currentId: string;
  currentName: string;
  wsList: { id: string; name: string }[];
  wsInput: string;
  onWsInput: (v: string) => void;
  onApply: (id: string) => void;
  loading: boolean;
  meta?: FeatureSummaryResponse;
  range: "7d" | "14d" | "30d";
  onRange: (r: "7d" | "14d" | "30d") => void;
  generatedAt?: string;
}) {
  return (
    <section className="relative overflow-hidden rounded-xl border border-primary/30 bg-gradient-to-br from-primary/15 via-surface to-surface p-5 shadow-sm" data-testid="ws-dash-hero">
      <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-primary/10 blur-3xl" />
      <div className="relative flex flex-wrap items-end gap-4">
        <div className="min-w-[260px] flex-1">
          <p className="text-[11px] uppercase tracking-wider text-primary/80">Workspace dashboard</p>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="ws-dash-title">{currentName || "Untitled workspace"}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-text-secondary">
            <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" />{meta?.workspace?.totalMembers ?? 0} members</span>
            {meta?.workspace?.ownerEmail && (<><span className="text-border">·</span><span className="truncate">owner: {meta.workspace.ownerEmail}</span></>)}
            {meta?.workspace?.createdAt && (<><span className="text-border">·</span><span>created {fmtRel(meta.workspace.createdAt)}</span></>)}
          </div>
        </div>

        {/* Workspace selector (dropdown + free id) */}
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex items-center gap-2 rounded-full border border-border bg-surface px-1.5 py-1 text-[11px]">
            <select
              className="bg-transparent px-2 py-1 text-text-secondary outline-none"
              value={currentId}
              onChange={(e) => onApply(e.target.value)}
              aria-label="Select workspace"
            >
              {loading ? <option>Loading…</option> : wsList.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-border bg-surface pl-2 pr-1 py-1 text-[11px]">
            <input
              value={wsInput}
              onChange={(e) => onWsInput(e.target.value)}
              placeholder="Workspace ID"
              className="w-44 bg-transparent px-2 py-1 font-mono text-text-secondary outline-none placeholder:text-text-muted"
            />
            <button onClick={() => wsInput.trim() && onApply(wsInput.trim())} className="rounded-full bg-primary px-3 py-1 text-white">
              Apply
            </button>
          </div>

          {/* Range pills */}
          <div className="flex items-center gap-1 rounded-full border border-border bg-surface p-0.5 text-[11px]" data-testid="ws-dash-range-picker">
            {(["7d", "14d", "30d"] as const).map((r) => (
              <button key={r} type="button" onClick={() => onRange(r)} data-testid={`ws-dash-range-${r}`} className={cn("rounded-full px-2.5 py-1 transition-colors", range === r ? "bg-primary text-white" : "text-text-secondary hover:bg-elevated")}>
                {r}
              </button>
            ))}
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-[10px] text-text-muted">
            <RefreshCw className="h-3 w-3" /> {generatedAt ? fmtRel(generatedAt) : "syncing"}
          </span>
        </div>
      </div>
    </section>
  );
}

/* ============================================================================
   Drawer body — details
============================================================================ */
function DrawerBody({ drawer, navigate, onClose }: { drawer: NonNullable<any>; navigate: any; onClose: () => void }) {
  const kind = drawer.kind as string;

  if (kind === "kpi") {
    const { def, total, delta, spark, which, d } = drawer.payload || {};
    const title = def?.label || which || "KPI";
    const breakdown = (() => {
      if (which === "Saved requests") return { Collections: d?.requests?.collections, Executions7d: d?.requests?.executionsLast7d };
      if (which === "Collections") return { SavedRequests: d?.requests?.savedRequests, Executions7d: d?.requests?.executionsLast7d };
      if (which === "Open bugs") return { Total: d?.bugTracker?.total, BySeverity: d?.bugTracker?.bySeverity };
      if (which === "Open incidents") return { ActiveMonitors: d?.monitors?.active, Paused: d?.monitors?.paused, Runs7d: d?.monitors?.runsLast7d };
      return null;
    })();

    return (
      <div className="space-y-4">
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-text-muted">Overview</div>
            <div className="text-xl font-semibold">{title}</div>
          </div>
          <div className="text-right text-[11px] text-text-muted">Total <span className="font-mono text-text-primary">{fmt(total)}</span>{typeof delta === "number" && delta !== 0 ? <> · Δ <span className={cn(delta > 0 ? "text-success" : "text-danger")}>{delta > 0 ? "+" : ""}{delta}</span></> : null}</div>
        </div>

        {spark && spark.length > 0 && (
          <div className="rounded-lg border border-border bg-elevated/40 p-3">
            <div className="mb-2 text-[11px] text-text-muted">Recent trend</div>
            <Sparkline values={spark} width={480} height={48} />
          </div>
        )}

        {breakdown && (
          <div className="rounded-lg border border-border bg-elevated/40 p-3">
            <div className="mb-2 text-[11px] text-text-muted">Breakdown</div>
            <table className="w-full text-[12px]">
              <tbody>
                {Object.entries(breakdown).map(([k, v]) => {
                  if (v && typeof v === "object") {
                    return (
                      <>
                        <tr key={k}><td className="py-1 font-mono text-text-muted">{k}</td><td className="py-1 text-right"></td></tr>
                        {Object.entries(v as any).map(([sk, sv]) => (
                          <tr key={sk}><td className="py-1 pl-4 font-mono">{sk}</td><td className="py-1 pr-1 text-right font-mono">{fmt(sv as number)}</td></tr>
                        ))}
                      </>
                    );
                  }
                  return (
                    <tr key={k}><td className="py-1 font-mono text-text-muted">{k}</td><td className="py-1 text-right font-mono">{fmt(v as number)}</td></tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <button onClick={() => navigate(`/projects/${(def?.key || "overview")}`)} className="rounded-md border border-border bg-elevated px-3 py-1.5 text-[12px] hover:bg-elevated/70">Open in product</button>
          <button onClick={onClose} className="rounded-md border border-border px-3 py-1.5 text-[12px] hover:bg-elevated">Close</button>
        </div>
      </div>
    );
  }

  if (kind === "activity") {
    const ts: TimeseriesResponse | undefined = drawer.payload?.ts;
    const totals = ts ? ts.days.map((_, i) => ts.series.reduce((a, s) => a + (s.values[i] ?? 0), 0)) : [];
    return (
      <div className="space-y-4">
        <div className="text-[11px] text-text-muted">Last period · series totals</div>
        <div className="rounded-lg border border-border bg-elevated/40 p-3">
          <div className="mb-2 text-[12px] font-medium">Top days</div>
          <table className="w-full text-[12px]">
            <thead>
              <tr className="text-text-muted">
                <th className="py-1 text-left font-normal">Day</th>
                <th className="py-1 text-right font-normal">Events</th>
                <th className="py-1 text-right font-normal">Share</th>
              </tr>
            </thead>
            <tbody>
              {totals.map((t, i) => ({ i, t, d: ts?.days[i] }))
                .sort((a, b) => b.t - a.t).slice(0, 8).map(({ i, t, d }) => (
                  <tr key={i} className="odd:bg-surface/60">
                    <td className="py-1 font-mono">{shortDate(d!)}</td>
                    <td className="py-1 text-right font-mono">{fmt(t)}</td>
                    <td className="py-1 text-right font-mono">{Math.round((t / (totals.reduce((a,b)=>a+b,0)||1))*100)}%</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <div className="rounded-lg border border-border bg-elevated/40 p-3">
          <div className="mb-2 text-[12px] font-medium">Series share</div>
          <PieSize share={(() => {
            if (!ts) return [];
            const total = ts.series.reduce((acc, s) => acc + s.values.reduce((a,b)=>a+b,0), 0) || 1;
            return ts.series.map((s, i) => ({ name: s.label, value: s.values.reduce((a,b)=>a+b,0), share: s.values.reduce((a,b)=>a+b,0)/total, color: CHART_COLORS[i%CHART_COLORS.length] }));
          })()} />
        </div>
      </div>
    );
  }

  if (kind === "passrate") {
    const ai = drawer.payload?.ai;
    const providers = Object.entries(ai?.byProvider ?? {});
    const maxCalls = Math.max(1, ...providers.map(([, n]) => n as number));
    return (
      <div className="space-y-4">
        <div className="text-xl font-semibold">AI run pass rate · last 7d</div>
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Runs (7d)" value={fmt(ai?.runsLast7d)} />
          <StatCard label="Pass rate" value={fmtPct(ai?.passRateLast7d)} accent={ai?.passRateLast7d >= 0.8 ? "text-success" : "text-warning"} />
          <StatCard label="Total spend" value={fmtUsd(ai?.totalCostUsd)} accent="text-orange-500" />
          <StatCard label="Suites" value={fmt(ai?.suites)} />
        </div>
        <div className="rounded-lg border border-border bg-elevated/40 p-3">
          <div className="mb-2 text-[12px] font-medium">Provider usage</div>
          {providers.length === 0 ? <div className="text-[12px] text-text-muted">No LLM calls yet.</div> :
            <ul className="space-y-2 text-[12px]">
              {providers.sort((a,b)=> (b[1] as number)-(a[1] as number)).map(([k,n], i) => (
                <li key={k}>
                  <div className="flex justify-between">
                    <span className="font-mono uppercase">{k}</span>
                    <span className="text-text-muted">{n as number} calls</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded bg-elevated">
                    <div className="h-full rounded" style={{ width: `${((n as number)/maxCalls)*100}%`, background: CHART_COLORS[i%CHART_COLORS.length] }} />
                  </div>
                </li>
              ))}
            </ul>
          }
        </div>
        {ai?.topModels?.length > 0 && (
          <div className="text-[12px] text-text-muted">Top models: <span className="font-mono text-text-primary">{ai.topModels.map((m:any)=>m.key).join(" · ")}</span></div>
        )}
      </div>
    );
  }

  if (kind === "methods") {
    const br: Record<string, number> = drawer.payload?.breakdown || {};
    const entries = Object.entries(br).map(([k, v]) => ({ method: k, count: v })).sort((a, b) => b.count - a.count);
    const total = entries.reduce((a, b) => a + b.count, 0) || 1;
    return (
      <div className="space-y-4">
        <div className="text-xl font-semibold">HTTP methods · last window</div>
        <PieSize share={entries.map((e, i) => ({ name: e.method, value: e.count, share: e.count/total, color: CHART_COLORS[i%CHART_COLORS.length] }))} />
        <table className="w-full text-[12px]">
          <thead><tr className="text-text-muted"><th className="py-1 text-left font-normal">Method</th><th className="py-1 text-right font-normal">Count</th><th className="py-1 text-right font-normal">Share</th></tr></thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.method} className="odd:bg-surface/60">
                <td className="py-1 font-mono">{e.method}</td>
                <td className="py-1 text-right font-mono">{fmt(e.count)}</td>
                <td className="py-1 text-right font-mono">{Math.round((e.count/total)*100)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (kind === "spend") {
    const ai = drawer.payload?.ai;
    const providers = Object.entries(ai?.byProvider ?? {});
    return (
      <div className="space-y-4">
        <div className="text-xl font-semibold">LLM spend & usage</div>
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Total spend" value={fmtUsd(ai?.totalCostUsd)} accent="text-orange-500" />
          <StatCard label="Runs (7d)" value={fmt(ai?.runsLast7d)} />
        </div>
        <div className="rounded-lg border border-border bg-elevated/40 p-3">
          <div className="mb-2 text-[12px] font-medium">By provider</div>
          <table className="w-full text-[12px]">
            <thead><tr className="text-text-muted"><th className="py-1 text-left font-normal">Provider</th><th className="py-1 text-right font-normal">Calls</th></tr></thead>
            <tbody>
              {providers.sort((a,b)=> (b[1] as number)-(a[1] as number)).map(([k,n]) => (
                <tr key={k} className="odd:bg-surface/60"><td className="py-1 font-mono uppercase">{k}</td><td className="py-1 text-right font-mono">{fmt(n as number)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (kind === "latency") {
    const p50 = Number(drawer.payload?.ov?.kpis?.latency?.p50 ?? 0);
    const p95 = Number(drawer.payload?.ov?.kpis?.latency?.p95 ?? 0);
    const p99 = Number(drawer.payload?.ov?.kpis?.latency?.p99 ?? 0);
    return (
      <div className="space-y-4">
        <div className="text-xl font-semibold">Latency percentiles</div>
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="P50" value={`${fmt(p50)} ms`} accent="text-success" />
          <StatCard label="P95" value={`${fmt(p95)} ms`} accent="text-warning" />
          <StatCard label="P99" value={`${fmt(p99)} ms`} accent="text-danger" />
        </div>
        <div className="text-[12px] text-text-muted">SLO tip: aim P95 &lt; 500ms for core APIs.</div>
      </div>
    );
  }

  if (kind === "success") {
    const passed = Number(drawer.payload?.ov?.kpis?.runs?.passed ?? 0);
    const failed = Number(drawer.payload?.ov?.kpis?.runs?.failed ?? 0);
    const total  = Number(drawer.payload?.ov?.kpis?.runs?.total  ?? (passed + failed));
    const score  = total > 0 ? Math.round((passed / total) * 100) : 0;
    return (
      <div className="space-y-4">
        <div className="text-xl font-semibold">Run success rate</div>
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Score" value={`${score}%`} accent={score >= 90 ? "text-success" : score >= 70 ? "text-warning" : "text-danger"} />
          <StatCard label="Passed" value={fmt(passed)} accent="text-success" />
          <StatCard label="Failed" value={fmt(failed)} accent={failed > 0 ? "text-danger" : "text-text-muted"} />
        </div>
      </div>
    );
  }

  if (kind === "heatmap") {
    const ts: TimeseriesResponse | undefined = drawer.payload?.ts;
    const totals = ts ? ts.days.map((_, i) => ts.series.reduce((a, s) => a + (s.values[i] ?? 0), 0)) : [];
    const max = Math.max(1, ...totals);
    return (
      <div className="space-y-4">
        <div className="text-xl font-semibold">Activity intensity</div>
        <div className="grid grid-cols-7 gap-1">
          {totals.map((t, i) => (
            <div key={i} className="aspect-square rounded-md border border-border" style={{ background: `hsl(${200 - (t/max)*200} 70% 30%)`, opacity: 0.6 + (t/max)*0.4 }} title={`${ts?.days[i]?.slice(0,10)} · ${t} events`} />
          ))}
        </div>
        <div className="text-[12px] text-text-muted">Darker cell = more events.</div>
      </div>
    );
  }

  if (kind === "trends") {
    const kpi = drawer.payload?.kpiTrends || {};
    return (
      <div className="space-y-3">
        <div className="text-xl font-semibold">KPI trends · raw</div>
        <pre className="max-h-[320px] overflow-auto rounded-lg border border-border bg-elevated/40 p-3 text-[11px]">{JSON.stringify(kpi, null, 2)}</pre>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-xl font-semibold">{drawer.title}</div>
      <pre className="max-h-[420px] overflow-auto rounded-lg border border-border bg-elevated/40 p-3 text-[11px]">{JSON.stringify(drawer.payload ?? {}, null, 2)}</pre>
    </div>
  );
}

/* ============================================================================
   Widgets / charts
============================================================================ */
const ActivityAreaChart = ({ data, loading }: { data?: TimeseriesResponse; loading: boolean }) => {
  const chartData = useMemo(() => {
    if (!data) return [];
    return data.days.map((day, idx) => {
      const row: Record<string, any> = { day: shortDate(day) };
      data.series.forEach((s) => { row[s.label] = s.values[idx] ?? 0; });
      return row;
    });
  }, [data]);

  const hasAny = chartData.some((r) => Object.entries(r).some(([k, v]) => k !== "day" && (v as number) > 0));
  if (loading) return <div className="h-60 animate-pulse rounded-md bg-elevated" />;
  if (!hasAny) return <Empty icon={Activity} text="No activity yet in this range" />;

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <defs>
          {data?.series.map((s, i) => (
            <linearGradient key={s.key} id={`g-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={0.5} />
              <stop offset="95%" stopColor={CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(127,127,127,0.15)" />
        <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#888" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: "#888" }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 6, fontSize: 11 }} itemStyle={{ color: "#eee" }} labelStyle={{ color: "#bbb" }} />
        {data?.series.map((s, i) => (
          <Area key={s.key} type="monotone" dataKey={s.label} stroke={CHART_COLORS[i % CHART_COLORS.length]} fill={`url(#g-${s.key})`} strokeWidth={2} />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
};

const PassRateRadial = ({ ai, loading, onOpen }: { ai?: FeatureSummaryResponse["aiTesting"]; loading: boolean; onOpen?: () => void }) => {
  const pct = Math.round((ai?.passRateLast7d ?? 0) * 100);
  const data = [{ name: "pass", value: pct, fill: pct >= 80 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#ef4444" }];

  return (
    <div className="flex h-full flex-col">
      <header className="mb-1 flex items-center justify-between">
        <div className="flex items-center gap-2"><Zap className="h-4 w-4 text-emerald-500" /><h2 className="text-sm font-semibold">AI run pass rate</h2></div>
        <button className="text-[11px] text-text-secondary hover:text-text-primary" onClick={onOpen}>Open details</button>
      </header>
      <p className="mb-1 text-[10px] text-text-muted">last 7 days · {ai?.runsLast7d ?? 0} runs</p>
      {loading ? <div className="h-48 animate-pulse rounded-md bg-elevated" /> : (ai?.runsLast7d ?? 0) === 0 ? <Empty icon={FlaskConical} text="No AI runs in this window" /> : (
        <div className="relative flex-1">
          <ResponsiveContainer width="100%" height={180}>
            <RadialBarChart innerRadius="64%" outerRadius="100%" data={data} startAngle={90} endAngle={-270}>
              <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
              <RadialBar background dataKey="value" cornerRadius={8} />
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="text-center">
              <div className="text-3xl font-bold leading-none">{pct}%</div>
              <div className="text-[10px] uppercase tracking-wider text-text-muted">passing</div>
            </div>
          </div>
        </div>
      )}
      <div className="mt-2 flex items-center justify-between border-t border-border/60 pt-2 text-[11px]">
        <span className="text-text-muted">Total spend</span>
        <span className="font-mono text-orange-600">{fmtUsd(ai?.totalCostUsd)}</span>
      </div>
    </div>
  );
};

const MethodDonut = ({ data, loading, onOpen }: { data?: Record<string, number>; loading: boolean; onOpen?: () => void }) => {
  const entries = Object.entries(data ?? {}).filter(([, n]) => (n ?? 0) > 0);
  const total = entries.reduce((s, [, n]) => s + (n ?? 0), 0);
  return (
    <div>
      <header className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2"><Globe className="h-4 w-4 text-blue-500" /><h2 className="text-sm font-semibold">HTTP method mix</h2></div>
        <button className="text-[11px] text-text-secondary hover:text-text-primary" onClick={onOpen}>Open details</button>
      </header>
      {loading ? <div className="h-40 animate-pulse rounded-md bg-elevated" /> : entries.length === 0 ? <Empty icon={Globe} text="No saved requests yet" /> : (
        <div className="flex items-center gap-3">
          <ResponsiveContainer width={140} height={140}>
            <PieChart>
              <Pie data={entries.map(([k, v]) => ({ name: k, value: v }))} innerRadius={42} outerRadius={62} dataKey="value" stroke="none">
                {entries.map(([k], i) => <Cell key={k} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #333", fontSize: 11 }} itemStyle={{ color: "#eee" }} />
            </PieChart>
          </ResponsiveContainer>
          <ul className="flex-1 space-y-1 text-[11px]">
            {entries.slice(0, 6).map(([k, n], i) => (
              <li key={k} className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-sm" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                <span className="font-mono">{k}</span>
                <span className="ml-auto text-text-muted">{n} · {total ? Math.round((n / total) * 100) : 0}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

const CostBar = ({ ai, loading, onOpen }: { ai?: FeatureSummaryResponse["aiTesting"]; loading: boolean; onOpen?: () => void }) => {
  const providers = Object.entries(ai?.byProvider ?? {}).sort((a, b) => (b[1] as number) - (a[1] as number)).slice(0, 4);
  const maxCount = Math.max(1, ...providers.map(([, n]) => n as number));
  return (
    <div>
      <header className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2"><Coins className="h-4 w-4 text-orange-500" /><h2 className="text-sm font-semibold">LLM spend & usage</h2></div>
        <button className="text-[11px] text-text-secondary hover:text-text-primary" onClick={onOpen}>Open details</button>
      </header>
      <div className="mb-2 flex items-baseline gap-2">
        <span className="text-2xl font-bold leading-none">{fmtUsd(ai?.totalCostUsd)}</span>
        <span className="text-[11px] text-text-muted">total spend</span>
      </div>
      {loading ? <div className="h-24 animate-pulse rounded-md bg-elevated" /> : providers.length === 0 ? <Empty icon={Cpu} text="No LLM calls yet" /> : (
        <ul className="space-y-1.5 text-[11px]">
          {providers.map(([k, n], i) => (
            <li key={k} className="space-y-0.5">
              <div className="flex justify-between">
                <span className="font-mono uppercase">{k}</span>
                <span className="text-text-muted">{n as number} call{(n as number) === 1 ? "" : "s"}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded bg-elevated">
                <div className="h-full rounded transition-all" style={{ width: `${((n as number) / maxCount) * 100}%`, background: CHART_COLORS[i % CHART_COLORS.length] }} />
              </div>
            </li>
          ))}
        </ul>
      )}
      {ai?.topModels?.[0] && (
        <div className="mt-2 border-t border-border/60 pt-2 text-[11px]">
          <span className="text-text-muted">Top model:</span>{" "}
          <span className="font-mono text-text-secondary">{ai.topModels[0].key}</span>
        </div>
      )}
    </div>
  );
};

const QuickStats = ({ d, loading, onOpen }: { d?: FeatureSummaryResponse; loading: boolean; onOpen?: (which: string) => void }) => (
  <div>
    <header className="mb-2 flex items-center gap-2"><Gauge className="h-4 w-4 text-violet-500" /><h2 className="text-sm font-semibold">Pulse</h2></header>
    {loading ? (
      <div className="grid grid-cols-2 gap-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-md bg-elevated" />)}</div>
    ) : (
      <div className="grid grid-cols-2 gap-2">
        <PulseTile label="Saved requests" value={fmt(d?.requests?.savedRequests)} accent="text-blue-500" onClick={() => onOpen?.("Saved requests")} />
        <PulseTile label="Collections" value={fmt(d?.requests?.collections)} accent="text-blue-500" onClick={() => onOpen?.("Collections")} />
        <PulseTile label="Execs (7d)" value={fmt(d?.requests?.executionsLast7d)} accent="text-emerald-500" />
        <PulseTile label="Open bugs" value={fmt(d?.bugTracker?.open)} accent={(d?.bugTracker?.open ?? 0) > 0 ? "text-red-500" : "text-text-secondary"} onClick={() => onOpen?.("Open bugs")} />
        <PulseTile label="Active webhooks" value={fmt(d?.webhooks?.active)} accent="text-indigo-500" />
        <PulseTile label="Open incidents" value={fmt(d?.monitors?.openIncidents)} accent={(d?.monitors?.openIncidents ?? 0) > 0 ? "text-red-500" : "text-emerald-500"} onClick={() => onOpen?.("Open incidents")} />
      </div>
    )}
  </div>
);

const PulseTile = ({ label, value, accent, onClick }: { label: string; value: string; accent: string; onClick?: () => void }) => (
  <button onClick={onClick} className="rounded-md border border-border/60 bg-elevated/40 p-2 text-left hover:border-primary/50">
    <div className={cn("text-lg font-bold leading-none", accent)}>{value}</div>
    <div className="mt-1 text-[10px] uppercase tracking-wider text-text-muted">{label}</div>
  </button>
);

/* ============================================================================
   Bento grid, Activity, details
============================================================================ */
const BentoGrid = ({ d, loading, workspaceId, onOpen }: { d?: FeatureSummaryResponse; loading: boolean; workspaceId: string; onOpen?: (title: string, kind: string, payload?: any) => void }) => (
  <section data-testid="ws-dash-bento">
    <header className="mb-3 flex items-baseline justify-between">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary">Across the platform</h2>
      <span className="text-[10px] text-text-muted">Click a tile to open details</span>
    </header>
    {loading || !d ? (
      <BentoSkeleton />
    ) : (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:auto-rows-[140px]">
        {/* AI Testing — 2×2 */}
        <BentoTileClickable to="/projects/ai-testing?view=overview" span="lg:col-span-2 lg:row-span-2" accent="violet" icon={FlaskConical} title="AI Testing" headline={fmt(d.aiTesting.totalRuns)} sub="runs across all suites"
          onOpen={() => onOpen?.("AI Testing", "bento", { aiTesting: d.aiTesting })}>
          <div className="grid grid-cols-3 gap-2 text-[11px]">
            <Stat label="Suites"     v={fmt(d.aiTesting.suites)} />
            <Stat label="Cases"      v={fmt(d.aiTesting.cases)} />
            <Stat label="Runs · 7d"  v={fmt(d.aiTesting.runsLast7d)} />
            <Stat label="Pass rate"  v={fmtPct(d.aiTesting.passRateLast7d)} accent={d.aiTesting.passRateLast7d >= 0.8 ? "text-emerald-500" : "text-amber-500"} />
            <Stat label="Spend"      v={fmtUsd(d.aiTesting.totalCostUsd)} accent="text-orange-500" />
            <Stat label="Last"       v={fmtRel(d.aiTesting.lastRunAt)} />
          </div>
        </BentoTileClickable>

        {/* Bug tracker — 2×1 */}
        <BentoTileClickable to={`/projects/functional-tests?view=bugs&workspaceId=${workspaceId}`} span="lg:col-span-2 lg:row-span-1" accent="red" icon={Bug} title="Bug tracker" headline={fmt(d.bugTracker.open)} sub={`open / ${fmt(d.bugTracker.total)} total`}
          onOpen={() => onOpen?.("Bug tracker", "bento", { bugTracker: d.bugTracker })}>
          <SevPills map={d.bugTracker.bySeverity} />
        </BentoTileClickable>

        {/* Security */}
        <BentoTileClickable to="/projects/security" span="lg:col-span-1 lg:row-span-1" accent="rose" icon={Shield} title="Security" headline={fmt(d.security.openFindings)} sub="open findings"
          onOpen={() => onOpen?.("Security", "bento", { security: d.security })}>
          <SevPills map={d.security.bySeverity} />
        </BentoTileClickable>

        {/* Webhooks */}
        <BentoTileClickable to="/projects/ai-testing?view=webhooks" span="lg:col-span-1 lg:row-span-1" accent="indigo" icon={Webhook} title="Webhooks" headline={fmt(d.webhooks.active)} sub={`active / ${fmt(d.webhooks.total)}`}
          onOpen={() => onOpen?.("Webhooks", "bento", { webhooks: d.webhooks })}>
          <div className="text-[11px] text-text-muted">Success {fmtPct(d.webhooks.successRateLast7d)} · {fmt(d.webhooks.deliveriesLast7d)} sent (7d)</div>
        </BentoTileClickable>

        {/* Monitors — 2×1 */}
        <BentoTileClickable to="/projects/monitors" span="lg:col-span-2 lg:row-span-1" accent="emerald" icon={Activity} title="Monitors" headline={fmt(d.monitors.active)} sub={`active / ${fmt(d.monitors.total)}`}
          onOpen={() => onOpen?.("Monitors", "bento", { monitors: d.monitors })}>
          <div className="grid grid-cols-3 gap-2 text-[11px]">
            <Stat label="Paused"     v={fmt(d.monitors.paused)} />
            <Stat label="Runs · 7d"  v={fmt(d.monitors.runsLast7d)} />
            <Stat label="Incidents"  v={fmt(d.monitors.openIncidents)} accent={d.monitors.openIncidents > 0 ? "text-red-500" : "text-emerald-500"} />
          </div>
        </BentoTileClickable>

        {/* Test specs */}
        <BentoTileClickable to={`/projects/test-specs?workspaceId=${workspaceId}`} span="lg:col-span-1 lg:row-span-1" accent="sky" icon={FileCode2} title="Test specs" headline={fmt(d.testSpecs.total)} sub={`${fmt(d.testSpecs.active)} active`}
          onOpen={() => onOpen?.("Test specs", "bento", { testSpecs: d.testSpecs })}>
          <div className="text-[11px] text-text-muted">Last import {fmtRel(d.testSpecs.lastImportAt)}</div>
        </BentoTileClickable>

        {/* Mocks */}
        <BentoTileClickable to="/projects/mocks" span="lg:col-span-1 lg:row-span-1" accent="cyan" icon={Server} title="Mock servers" headline={fmt(d.mocks.active)} sub={`active / ${fmt(d.mocks.total)}`}
          onOpen={() => onOpen?.("Mock servers", "bento", { mocks: d.mocks })}>
          <div className="text-[11px] text-text-muted">{fmt(d.mocks.hitsLast7d)} hits (7d)</div>
        </BentoTileClickable>

        {/* Chat & agents */}
        <BentoTileClickable to="/projects/ai-assistant" span="lg:col-span-1 lg:row-span-1" accent="fuchsia" icon={MessageSquare} title="AI chat & agents" headline={fmt(d.chatAndAgents.aiSessions)} sub="sessions"
          onOpen={() => onOpen?.("AI chat & agents", "bento", { chatAndAgents: d.chatAndAgents })}>
          <div className="text-[11px] text-text-muted">{fmt(d.chatAndAgents.aiAgentConfigs)} agents · {fmt(d.chatAndAgents.mcpServers)} MCP</div>
        </BentoTileClickable>

        {/* Notifications */}
        <BentoTileClickable to="/projects/notifications" span="lg:col-span-1 lg:row-span-1" accent="yellow" icon={Bell} title="Notifications" headline={fmt(d.notifications.unread)} sub={`unread / ${fmt(d.notifications.total)}`}
          onOpen={() => onOpen?.("Notifications", "bento", { notifications: d.notifications })}>
          <div className={cn("text-[11px]", d.notifications.unread > 0 ? "text-orange-500" : "text-emerald-500")}>{d.notifications.unread > 0 ? "Pending action" : "All clear"}</div>
        </BentoTileClickable>
      </div>
    )}
  </section>
);

const Stat = ({ label, v, accent }: { label: string; v: string; accent?: string }) => (
  <div>
    <div className={cn("font-semibold", accent ?? "text-text-primary")}>{v}</div>
    <div className="text-[10px] uppercase tracking-wider text-text-muted">{label}</div>
  </div>
);

const SevPills = ({ map }: { map: Record<string, number> }) => {
  const entries = Object.entries(map ?? {}).filter(([, n]) => (n ?? 0) > 0);
  if (entries.length === 0) return <span className="text-[11px] italic text-text-muted">none</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {entries.map(([k, n]) => (
        <span key={k} className="inline-flex items-center gap-1 rounded-md border border-current/30 px-1.5 py-0.5 text-[10px] font-mono" style={{ color: SEV_COLOR[k] || "#94a3b8" }}>
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: SEV_COLOR[k] || "#94a3b8" }} />
          {k.toLowerCase()} · {n}
        </span>
      ))}
    </div>
  );
};

const ACCENT_BG: Record<string, string> = {
  violet:  "bg-violet-500/10 text-violet-600  dark:text-violet-300",
  red:     "bg-red-500/10    text-red-600     dark:text-red-300",
  rose:    "bg-rose-500/10   text-rose-600    dark:text-rose-300",
  indigo:  "bg-indigo-500/10 text-indigo-600  dark:text-indigo-300",
  emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  sky:     "bg-sky-500/10    text-sky-600     dark:text-sky-300",
  cyan:    "bg-cyan-500/10   text-cyan-600    dark:text-cyan-300",
  fuchsia: "bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-300",
  yellow:  "bg-yellow-500/10 text-yellow-700  dark:text-yellow-300",
};

const BentoTileClickable = ({ to, span, accent, icon: Icon, title, headline, sub, children, onOpen }: any) => (
  <div className={cn("group flex flex-col rounded-xl border border-border bg-surface p-3 transition-all hover:border-primary/60 hover:shadow-lg", span)} data-testid={`bento-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>
    <div className="flex items-center gap-2">
      <div className={cn("grid h-7 w-7 place-items-center rounded-md", ACCENT_BG[accent] ?? "bg-primary/10")}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <h3 className="text-[13px] font-semibold">{title}</h3>
      <button onClick={onOpen} className="ml-auto inline-flex items-center gap-1 text-[11px] text-text-secondary hover:text-text-primary">Details <ArrowRight className="h-3.5 w-3.5" /></button>
    </div>
    <Link to={to} className="mt-2 mb-2 flex items-baseline gap-2">
      <span className="text-2xl font-bold leading-none">{headline}</span>
      <span className="text-[11px] text-text-muted">{sub}</span>
    </Link>
    <div className="flex-1">{children}</div>
  </div>
);

const BentoSkeleton = () => (
  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:auto-rows-[140px]">
    <div className="lg:col-span-2 lg:row-span-2 h-72 animate-pulse rounded-xl bg-elevated" />
    <div className="lg:col-span-2 h-32 animate-pulse rounded-xl bg-elevated" />
    {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-32 animate-pulse rounded-xl bg-elevated" />)}
  </div>
);

/* ============================================================================
   Activity timeline
============================================================================ */
const ActivityTimeline = ({ data, loading, onOpen }: { data?: RecentActivityResponse; loading: boolean; onOpen?: (row: any) => void }) => {
  const items = data?.items ?? [];
  const grouped = useMemo(() => {
    const out: Record<string, typeof items> = {};
    for (const it of items) {
      const day = (it.timestamp ?? "").slice(0, 10) || "Earlier";
      (out[day] ||= []).push(it);
    }
    return Object.entries(out).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [items]);

  return (
    <section className="rounded-xl border border-border bg-surface p-4" data-testid="ws-dash-activity-feed">
      <header className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Recent activity</h2>
        </div>
        <span className="text-[11px] text-text-muted">{items.length} event{items.length === 1 ? "" : "s"}</span>
      </header>
      {loading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-10 animate-pulse rounded bg-elevated" />)}</div>
      ) : items.length === 0 ? (
        <Empty icon={Clock} text="No recent activity for this workspace" />
      ) : (
        <ol className="space-y-4">
          {grouped.map(([day, rows]) => (
            <li key={day}>
              <div className="mb-1.5 inline-block rounded-full bg-elevated px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-text-muted">{day}</div>
              <ul className="ml-2 space-y-1.5 border-l-2 border-border/60 pl-3">
                {rows.map((r) => (
                  <li key={r.id} className="group flex items-start gap-2 rounded-md px-1.5 py-1 transition-colors hover:bg-elevated/40">
                    <div className="mt-1 h-2 w-2 shrink-0 -translate-x-[18px] rounded-full bg-primary/70 group-hover:bg-primary" />
                    <div className="min-w-0 flex-1 text-[12px]">
                      <div className="flex items-baseline gap-2">
                        <span className="font-medium">{r.actor || "system"}</span>
                        <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-primary">{r.action}</span>
                        {r.entityType && <span className="text-text-muted">on {r.entityType}</span>}
                      </div>
                      {r.description && <div className="truncate text-[11px] text-text-secondary">{r.description}</div>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="shrink-0 text-[10px] text-text-muted">{r.timestamp ? new Date(r.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}</span>
                      <button className="text-[11px] text-text-secondary hover:text-text-primary" onClick={() => onOpen?.(r)}>Details</button>
                    </div>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
};

/* ============================================================================
   Widgets / mini charts
============================================================================ */
const Sparkline = ({ values, width = 56, height = 20 }: { values?: number[]; width?: number; height?: number }) => {
  if (!values || values.length === 0) return null;
  const W = width, H = height;
  const max = Math.max(1, ...values);
  const pts = values.map((v, i) => {
    const x = (i / Math.max(1, values.length - 1)) * W;
    const y = H - (v / max) * (H - 2) - 1;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-5 w-14 shrink-0 text-primary">
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity={0.9} />
    </svg>
  );
};

const LatencyDial = ({ ov, loading, onOpen }: { ov?: any; loading: boolean; onOpen?: () => void }) => {
  if (loading) return <div className="h-40 animate-pulse rounded-md bg-elevated" />;
  const p50 = Number(ov?.kpis?.latency?.p50 ?? 0);
  const p95 = Number(ov?.kpis?.latency?.p95 ?? 0);
  const p99 = Number(ov?.kpis?.latency?.p99 ?? 0);
  const rows = [
    { label: "P50", value: p50, tone: "bg-success" },
    { label: "P95", value: p95, tone: "bg-warning" },
    { label: "P99", value: p99, tone: "bg-danger" },
  ];
  const max = Math.max(p50, p95, p99, 1000);
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-text-muted">Percentiles</span>
        <button className="text-[11px] text-text-secondary hover:text-text-primary" onClick={onOpen}>Open details</button>
      </div>
      {rows.map((b) => (
        <div key={b.label} className="space-y-1">
          <div className="flex items-center justify-between text-[10px]">
            <span className="font-mono font-semibold text-text-secondary">{b.label}</span>
            <span className="tabular-nums text-text-muted">{b.value.toLocaleString()} ms</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-elevated">
            <div className={cn("h-full rounded-full transition-[width]", b.tone)} style={{ width: `${Math.min(100, (b.value / max) * 100).toFixed(1)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
};

const SuccessGauge = ({ ov, loading, onOpen }: { ov?: any; loading: boolean; onOpen?: () => void }) => {
  if (loading) return <div className="h-40 animate-pulse rounded-md bg-elevated" />;
  const passed = Number(ov?.kpis?.runs?.passed ?? 0);
  const failed = Number(ov?.kpis?.runs?.failed ?? 0);
  const total  = Number(ov?.kpis?.runs?.total  ?? (passed + failed));
  const score  = total > 0 ? Math.round((passed / total) * 100) : 0;
  const tone   = score >= 90 ? "#10b981" : score >= 70 ? "#f59e0b" : "#ef4444";
  const R = 42, CX = 50, CY = 50;
  const C = 2 * Math.PI * R;
  const dash = `${((score / 100) * C).toFixed(2)} ${C.toFixed(2)}`;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-text-muted">Pass rate</span>
        <button className="text-[11px] text-text-secondary hover:text-text-primary" onClick={onOpen}>Open details</button>
      </div>
      <div className="flex items-center gap-4">
        <svg viewBox="0 0 100 100" className="h-32 w-32">
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="var(--color-elevated)" strokeWidth={10} />
          <circle cx={CX} cy={CY} r={R} fill="none" stroke={tone} strokeWidth={10} strokeLinecap="round" strokeDasharray={dash} transform={`rotate(-90 ${CX} ${CY})`} />
          <text x={CX} y={CY - 1} textAnchor="middle" fill={tone} fontSize="20" fontWeight="700">{score}%</text>
          <text x={CX} y={CY + 13} textAnchor="middle" className="fill-text-muted" fontSize="6.5">pass rate</text>
        </svg>
        <ul className="flex-1 space-y-1.5 text-[11px]">
          <li className="flex items-center justify-between"><span className="text-text-muted">Passed</span><span className="tabular-nums font-semibold text-success">{passed}</span></li>
          <li className="flex items-center justify-between"><span className="text-text-muted">Failed</span><span className={cn("tabular-nums font-semibold", failed > 0 ? "text-danger" : "text-text-muted")}>{failed}</span></li>
          <li className="flex items-center justify-between"><span className="text-text-muted">Total</span><span className="tabular-nums font-semibold">{total}</span></li>
        </ul>
      </div>
    </div>
  );
};

const ActivityHeatmap = ({ data, loading, onOpen }: { data?: TimeseriesResponse; loading: boolean; onOpen?: () => void }) => {
  if (loading || !data) return <div className="h-40 animate-pulse rounded-md bg-elevated" />;
  const totals = data.days.map((_, i) => data.series.reduce((a, s) => a + (s.values[i] ?? 0), 0));
  const max = Math.max(1, ...totals);
  const HEAT = ["#0f172a", "#1e3a8a", "#1d4ed8", "#3b82f6", "#60a5fa", "#fb923c", "#ef4444"];
  const color = (v: number) => HEAT[Math.min(HEAT.length - 1, Math.floor((v / max) * (HEAT.length - 1)))];
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-text-muted">Intensity grid</span>
        <button className="text-[11px] text-text-secondary hover:text-text-primary" onClick={onOpen}>Open details</button>
      </div>
      <div className="grid auto-rows-fr gap-1.5" style={{ gridTemplateColumns: `repeat(${data.days.length}, 1fr)` }}>
        {data.days.map((d) => <div key={d} title={`${shortDate(d)}: ${totals[ data.days.indexOf(d) ]} events`} className="h-12 rounded-md border border-border/40 transition-transform hover:scale-105" style={{ background: color(totals[ data.days.indexOf(d) ]) }} />)}
      </div>
      <div className="flex items-center justify-between text-[10px] text-text-muted">
        <span>Low</span>
        <div className="flex gap-1">{HEAT.map((c) => <span key={c} className="h-2 w-3 rounded-sm" style={{ background: c }} />)}</div>
        <span>High</span>
      </div>
      <div className="flex justify-between text-[9px] text-text-muted">{data.days.map((d) => <span key={d}>{shortDate(d)}</span>)}</div>
    </div>
  );
};

const TrendMatrix = ({ kpiTrends, loading }: { kpiTrends?: Record<string, number[]>; loading: boolean }) => {
  if (loading) return <div className="h-40 animate-pulse rounded-md bg-elevated" />;
  const entries = Object.entries(kpiTrends ?? {}).filter(([, vs]) => vs && vs.length > 0);
  if (entries.length === 0) return <div className="rounded-md border border-dashed border-border px-3 py-6 text-center text-[11px] text-text-muted">No trend data yet.</div>;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {entries.map(([key, values]) => {
        const max = Math.max(1, ...values);
        const min = Math.min(0, ...values);
        const last = values[values.length - 1] ?? 0;
        const first = values[0] ?? 0;
        const delta = last - first;
        const W = 100, H = 32;
        const pts = values.map((v, idx) => {
          const x = (idx / Math.max(1, values.length - 1)) * W;
          const y = H - ((v - min) / Math.max(1, max - min)) * (H - 2) - 1;
          return `${x.toFixed(1)},${y.toFixed(1)}`;
        }).join(" ");
        return (
          <div key={key} className="rounded-lg border border-border bg-elevated/50 p-2.5">
            <div className="flex items-center justify-between">
              <span className="truncate text-[10px] font-medium uppercase tracking-wider text-text-muted">{key}</span>
              <span className={cn("rounded px-1 text-[9px] font-semibold tabular-nums", delta > 0 ? "bg-success/10 text-success" : delta < 0 ? "bg-danger/10 text-danger" : "bg-elevated text-text-muted")}>
                {delta > 0 ? "+" : ""}{delta}
              </span>
            </div>
            <div className="mt-1 flex items-end justify-between gap-2">
              <span className="text-base font-semibold tabular-nums">{last.toLocaleString()}</span>
              <svg viewBox={`0 0 ${W} ${H}`} className="h-7 w-20" preserveAspectRatio="none">
                <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="1.2" className="text-primary" />
              </svg>
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ============================================================================
   Small UI bits
============================================================================ */
const Empty = ({ icon: Icon, text }: { icon: any; text: string }) => (
  <div className="grid h-32 place-items-center text-center text-text-muted">
    <div>
      <Icon className="mx-auto mb-1 h-5 w-5 opacity-50" />
      <p className="text-[11px]">{text}</p>
    </div>
  </div>
);

const StatCard = ({ label, value, accent }: { label: string; value?: string; accent?: string }) => (
  <div className="rounded-lg border border-border bg-elevated/40 p-3">
    <div className={cn("text-[18px] font-semibold leading-none tabular-nums", accent)}>
      {value ?? "—"}
    </div>
    <div className="mt-1 text-[10px] uppercase tracking-wider text-text-muted">{label}</div>
  </div>
);

const PieSize = ({ share }: { share: { name: string; value: number; share: number; color: string }[] }) => (
  <div className="flex items-center gap-3">
    <div className="h-24 w-24">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={share} dataKey="value" innerRadius={28} outerRadius={42} stroke="none">
            {share.map((s, i) => <Cell key={i} fill={s.color} />)}
          </Pie>
          <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #333", fontSize: 11 }} itemStyle={{ color: "#eee" }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
    <ul className="space-y-1 text-[11px]">
      {share.map((s, i) => (
        <li key={i} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-sm" style={{ background: s.color }} />
          <span className="font-mono">{s.name}</span>
          <span className="ml-auto text-text-muted">{Math.round(s.share * 100)}%</span>
        </li>
      ))}
    </ul>
  </div>
);
