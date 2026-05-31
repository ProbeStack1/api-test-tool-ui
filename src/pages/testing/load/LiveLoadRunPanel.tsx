/**
 * LiveLoadRunPanel — replaces the configure form on the Load Tests
 * "Runs" tab once a run is queued. Polls run state every 1.5s and
 * subscribes to the SSE stream for ticker updates. On terminal status
 * shows the final RPS/p95/p99/error-rate stats with [Start another].
 */
import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Play,
  Pause,
  Ban,
  Loader2,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertOctagon,
  Plus,
  ExternalLink,
  Download,
  Gauge,
  Activity,
  Timer,
  Zap,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  getRun,
  pauseRun,
  resumeRun,
  cancelRun,
  openRunStream,
  downloadReport,
  downloadReportBlob,
  type LoadRun,
  type ReportFormat,
} from "@/services/loadTest.service";
import { useTestingStore } from "@/stores/testing.store";
import { RunStatusBadge } from "../functional/shared/RunBadges";
import { cn } from "@/utils/cn";
import { LiveLoadRunChart, type LiveLoadSample } from "./LiveLoadRunChart";

const TERMINAL = new Set(["SUCCESS", "FAILED", "ERROR", "CANCELLED"]);

interface Props {
  runId: string;
}

interface StreamLine {
  ts: number;
  kind: string;
  text: string;
}

export const LiveLoadRunPanel = ({ runId }: Props) => {
  const qc = useQueryClient();
  const setLiveRun = useTestingStore((s) => s.setLiveLoadRun);
  const openLoadRun = useTestingStore((s) => s.openLoadRun);

  const [lines, setLines] = useState<StreamLine[]>([]);
  const [streamConnected, setStreamConnected] = useState(false);
  const [reportBusy, setReportBusy] = useState<ReportFormat | null>(null);
  const [latestSample, setLatestSample] = useState<
    LiveLoadSample | undefined
  >();
  const linesEndRef = useRef<HTMLDivElement>(null);

  const runQ = useQuery({
    queryKey: ["loadTest", "live-run", runId],
    queryFn: () => getRun(runId),
    refetchInterval: (q) => {
      const r = q.state.data as LoadRun | undefined;
      return r && TERMINAL.has(r.status) ? false : 1500;
    },
  });
  const run = runQ.data;
  const isTerminal = !!run && TERMINAL.has(run.status);

  /* SSE */
  useEffect(() => {
    if (!runId || isTerminal) return;
    const es = openRunStream(runId);
    const onEv = (ev: MessageEvent, kind: string) => {
      try {
        const p = ev.data ? JSON.parse(ev.data) : {};
        // Push a chart sample whenever the backend sends throughput
        // metrics (`tick` / `progress` / `live.stats`). Support both the
        // legacy payload keys and the newer `live.stats` keys.
        const rpsVal = Number(p.actualRps ?? p.rps);
        const p95Val =
          Number(p.p95Ms ?? p.percentiles?.["p95"] ?? p.p95 ?? 0) || 0;
        const p99Val =
          Number(p.p99Ms ?? p.percentiles?.["p99"] ?? p.p99 ?? 0) || 0;
        const errPctVal = Number(p.errorRatePct ?? 0) || 0;
        if (kind === "tick" || kind === "progress" || kind === "live.stats") {
          if (Number.isFinite(rpsVal)) {
            setLatestSample({
              ts: Date.now(),
              rps: rpsVal,
              p95: p95Val,
              p99: p99Val,
              errPct: errPctVal,
            });
          }
        }
        const text =
          p.message ??
          p.statusReason ??
          (kind === "stage.change"
            ? `stage ${p.stage ?? "?"} target=${p.targetVus ?? "?"} dur=${p.durationSec ?? "?"}s`
            : p.actualRps != null || p.rps != null
              ? `rps=${Number(p.actualRps ?? p.rps).toFixed(1)} p95=${p.p95Ms ?? p.p95 ?? p.percentiles?.["p95"] ?? "?"}ms err=${errPctVal.toFixed(2)}%`
              : kind);
        setLines((prev) => [
          ...prev.slice(-499),
          { ts: Date.now(), kind, text },
        ]);
      } catch {
        setLines((prev) => [
          ...prev.slice(-499),
          { ts: Date.now(), kind, text: kind },
        ]);
      }
    };
    es.addEventListener("open", () => setStreamConnected(true));
    es.addEventListener("error", () => setStreamConnected(false));
    es.addEventListener("run.start", (e) =>
      onEv(e as MessageEvent, "run.start"),
    );
    es.addEventListener("run.paused", (e) =>
      onEv(e as MessageEvent, "run.paused"),
    );
    es.addEventListener("run.resumed", (e) =>
      onEv(e as MessageEvent, "run.resumed"),
    );
    es.addEventListener("tick", (e) => onEv(e as MessageEvent, "tick"));
    es.addEventListener("live.stats", (e) =>
      onEv(e as MessageEvent, "live.stats"),
    );
    es.addEventListener("progress", (e) => onEv(e as MessageEvent, "progress"));
    es.addEventListener("stage.change", (e) =>
      onEv(e as MessageEvent, "stage.change"),
    );
    es.addEventListener("run.done", (e) => onEv(e as MessageEvent, "run.done"));
    return () => {
      es.close();
    };
  }, [runId, isTerminal]);

  // Also seed chart from `getRun` polls so the chart shows data even
  // when the SSE stream drops (network blip, Cloudflare cold-start).
  useEffect(() => {
    if (!run || isTerminal) return;
    if (run.actualRps == null && run.totalRequests == null) return;
    setLatestSample({
      ts: Date.now(),
      rps: Number(run.actualRps ?? 0),
      p95: Number(run.percentiles?.["p95"] ?? run.percentiles?.["95"] ?? 0),
      p99: Number(run.percentiles?.["p99"] ?? run.percentiles?.["99"] ?? 0),
      errPct: total > 0 ? (failed / total) * 100 : 0,
    });
    // We deliberately only depend on these scalars — the `run` object
    // itself changes identity every poll and would cause infinite loops.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    run?.actualRps,
    run?.percentiles?.["p95"],
    run?.percentiles?.["p99"],
    run?.totalRequests,
    run?.failedRequests,
    isTerminal,
  ]);

  useEffect(() => {
    linesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines.length]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["loadTest"] });
  const pauseMut = useMutation({
    mutationFn: () => pauseRun(runId),
    onSuccess: invalidate,
  });
  const resumeMut = useMutation({
    mutationFn: () => resumeRun(runId),
    onSuccess: invalidate,
  });
  const cancelMut = useMutation({
    mutationFn: () => cancelRun(runId),
    onSuccess: invalidate,
  });

  const onDownload = async (fmt: ReportFormat) => {
    setReportBusy(fmt);
    try {
      const { blob, contentDisposition } = await downloadReport(runId, fmt);
      downloadReportBlob(
        blob,
        contentDisposition,
        `load-${runId.slice(0, 8)}.${fmt.toLowerCase()}.${fmt === "JSON" ? "json" : fmt === "JUNIT" ? "xml" : "html"}`,
      );
    } finally {
      setReportBusy(null);
    }
  };

  const status = run?.status ?? "QUEUED";
  const isRunning = status === "RUNNING";
  const isPaused = status === "PAUSED";

  const total = run?.totalRequests ?? 0;
  const successful = run?.successfulRequests ?? 0;
  const failed = run?.failedRequests ?? 0;
  const actualRps = run?.actualRps ?? 0;
  const avgLat = run?.avgLatencyMs ?? 0;
  const p95 = run?.percentiles?.["p95"] ?? 0;
  const p99 = run?.percentiles?.["p99"] ?? 0;
  const errRate = total > 0 ? (failed / total) * 100 : 0;

  // Approximate elapsed for progress when duration is set.
  const elapsedSec =
    run?.startedAt && typeof run.startedAt === "string"
      ? Math.max(0, (Date.now() - new Date(run.startedAt).getTime()) / 1000)
      : 0;
  const targetDur = run?.config?.durationSeconds ?? 0;
  const progressPct = isTerminal
    ? 100
    : targetDur > 0
      ? Math.min(100, (elapsedSec / targetDur) * 100)
      : 0;

  return (
    <section
      data-testid="live-load-panel"
      className="overflow-hidden rounded-2xl border border-border bg-surface/50 shadow-sm"
    >
      {/* status bar */}
      <div
        className={cn(
          "relative border-b border-border px-6 py-4",
          !isTerminal &&
            "bg-gradient-to-r from-amber-500/[0.04] via-amber-500/[0.10] to-amber-500/[0.04]",
        )}
      >
        {!isTerminal && (
          <div className="absolute inset-x-0 top-0 h-0.5 overflow-hidden">
            <div className="h-full w-1/3 animate-[sweep_2s_linear_infinite] bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={cn(
              "grid h-9 w-9 place-items-center rounded-lg ring-1",
              status === "SUCCESS"
                ? "bg-success/15 text-success ring-success/30"
                : status === "FAILED"
                  ? "bg-danger/15  text-danger  ring-danger/30"
                  : status === "ERROR"
                    ? "bg-danger/15  text-danger  ring-danger/30"
                    : status === "CANCELLED"
                      ? "bg-text-muted/15 text-text-muted ring-border"
                      : "bg-amber-500/15 text-amber-400 ring-amber-500/30",
            )}
          >
            {status === "SUCCESS" ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : status === "FAILED" ? (
              <XCircle className="h-4 w-4" />
            ) : status === "ERROR" ? (
              <AlertOctagon className="h-4 w-4" />
            ) : status === "CANCELLED" ? (
              <Ban className="h-4 w-4" />
            ) : (
              <Sparkles className="h-4 w-4 animate-pulse" />
            )}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2
                className="truncate text-sm font-semibold tracking-tight"
                data-testid="live-load-name"
              >
                {run?.name || `Load run ${runId.slice(0, 8)}`}
              </h2>
              <RunStatusBadge status={status} />
              {!isTerminal && streamConnected && (
                <span className="inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-[9px] font-semibold text-success">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />{" "}
                  live
                </span>
              )}
              {run?.passed === false && isTerminal && (
                <span className="inline-flex items-center gap-1 rounded-full border border-danger/30 bg-danger/10 px-2 py-0.5 text-[9px] font-semibold text-danger">
                  <AlertTriangle className="h-3 w-3" /> thresholds breached
                </span>
              )}
            </div>
            <p className="mt-0.5 text-[11px] text-text-muted">
              {run?.config?.concurrency ?? 0} VUs
              {run?.config?.targetRps ? (
                <> · target {run.config.targetRps} rps</>
              ) : (
                <> · unlimited</>
              )}
              {run?.config?.durationSeconds ? (
                <> · {run.config.durationSeconds}s</>
              ) : null}
              {run?.config?.rampUpSeconds ? (
                <> · ramp {run.config.rampUpSeconds}s</>
              ) : null}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            {isRunning && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => pauseMut.mutate()}
                disabled={pauseMut.isPending}
                data-testid="live-load-pause"
              >
                {pauseMut.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Pause className="h-3.5 w-3.5" />
                )}{" "}
                Pause
              </Button>
            )}
            {isPaused && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => resumeMut.mutate()}
                disabled={resumeMut.isPending}
                data-testid="live-load-resume"
              >
                {resumeMut.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Play className="h-3.5 w-3.5" />
                )}{" "}
                Resume
              </Button>
            )}
            {(isRunning || isPaused) && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => cancelMut.mutate()}
                disabled={cancelMut.isPending}
                data-testid="live-load-cancel"
              >
                {cancelMut.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Ban className="h-3.5 w-3.5" />
                )}{" "}
                Cancel
              </Button>
            )}
            {isTerminal && (
              <>
                <div className="flex items-center gap-1 rounded-md border border-border bg-probestack-bg p-0.5">
                  {(["HTML", "JSON", "JUNIT"] as ReportFormat[]).map((f) => (
                    <button
                      key={f}
                      data-testid={`live-load-report-${f.toLowerCase()}`}
                      onClick={() => onDownload(f)}
                      disabled={reportBusy !== null}
                      className="rounded px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-text-secondary transition-colors hover:bg-hover hover:text-text-primary disabled:opacity-50"
                    >
                      {reportBusy === f ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        f
                      )}
                    </button>
                  ))}
                  <Download className="ml-1 h-3 w-3 text-text-muted" />
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openLoadRun(runId)}
                  data-testid="live-load-open-detail"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Open detail
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => setLiveRun(null)}
                  data-testid="live-load-start-another"
                >
                  <Plus className="h-3.5 w-3.5" /> Start another
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid gap-3 border-b border-border bg-elevated/20 px-6 py-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        <Tile
          icon={Activity}
          label="Requests"
          value={total.toLocaleString()}
          testId="live-load-kpi-total"
        />
        <Tile
          icon={Zap}
          label="RPS"
          value={actualRps.toFixed(1)}
          tone="amber"
          testId="live-load-kpi-rps"
        />
        <Tile
          icon={Timer}
          label="Avg latency"
          value={`${avgLat.toFixed(0)}ms`}
          testId="live-load-kpi-avg"
        />
        <Tile
          icon={Gauge}
          label="p95"
          value={`${p95}ms`}
          testId="live-load-kpi-p95"
        />
        <Tile
          icon={Gauge}
          label="p99"
          value={`${p99}ms`}
          testId="live-load-kpi-p99"
        />
        <Tile
          icon={CheckCircle2}
          label="Success"
          value={successful.toLocaleString()}
          tone="success"
          testId="live-load-kpi-success"
        />
        <Tile
          icon={XCircle}
          label="Errors"
          value={`${failed.toLocaleString()} (${errRate.toFixed(2)}%)`}
          tone="danger"
          testId="live-load-kpi-errors"
        />
      </div>

      {/* progress */}
      <div className="border-b border-border px-6 py-3">
        <div className="mb-1.5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
          <span>Progress</span>
          <span
            data-testid="live-load-progress"
            className="font-mono normal-case text-text-secondary"
          >
            {targetDur > 0 ? (
              <>
                {Math.min(elapsedSec, targetDur).toFixed(0)}s / {targetDur}s
              </>
            ) : (
              <>{elapsedSec.toFixed(0)}s elapsed</>
            )}
            {targetDur > 0 && <> · {progressPct.toFixed(0)}%</>}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-elevated">
          {targetDur > 0 ? (
            <div
              className={cn(
                "h-full transition-all duration-500",
                isTerminal
                  ? failed > 0
                    ? "bg-danger"
                    : "bg-success"
                  : "bg-amber-400",
              )}
              style={{ width: `${progressPct}%` }}
            />
          ) : (
            <div
              className={cn(
                "h-full bg-amber-400/40",
                !isTerminal &&
                  "animate-[indeterminate_1.4s_ease-in-out_infinite]",
              )}
              style={{ width: "40%" }}
            />
          )}
        </div>
      </div>

      {/* Live time-series chart — surfaces RPS / p95 / p99 / error% on
          a rolling window so the user can spot regressions visually
          while the run is mid-flight. */}
      <div className="border-b border-border px-6 py-4">
        <LiveLoadRunChart
          latest={latestSample}
          resetKey={runId}
          thresholds={{
            p95: run?.thresholds?.maxP95LatencyMs ?? undefined,
            p99: run?.thresholds?.maxP99LatencyMs ?? undefined,
            errPct: run?.thresholds?.maxErrorRatePct ?? undefined,
          }}
        />
      </div>

      {/* stream feed */}
      <div className="px-6 py-4" data-testid="live-load-stream">
        <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
          <span>Activity</span>
          {!isTerminal && !streamConnected && (
            <span className="text-warning">· stream reconnecting…</span>
          )}
        </div>
        <div className="h-56 overflow-auto rounded-lg border border-border/60 bg-probestack-bg/40 p-3 font-mono text-[11px]">
          {lines.length === 0 ? (
            <p className="text-text-muted" data-testid="live-load-stream-empty">
              {isTerminal
                ? "Run completed before streaming connected."
                : "Waiting for first tick…"}
            </p>
          ) : (
            lines.map((l, i) => (
              <div key={i} className="flex gap-2 leading-5">
                <span className="w-16 shrink-0 text-text-muted">
                  {new Date(l.ts).toLocaleTimeString()}
                </span>
                <span className="w-20 shrink-0 font-semibold text-text-secondary">
                  {l.kind}
                </span>
                <span className="min-w-0 flex-1 truncate text-text-secondary">
                  {l.text}
                </span>
              </div>
            ))
          )}
          <div ref={linesEndRef} />
        </div>
      </div>

      {!!run?.thresholdViolations?.length && (
        <div
          className="border-t border-border bg-danger/[0.06] px-6 py-3 text-xs text-danger"
          data-testid="live-load-violations"
        >
          <strong>Thresholds breached:</strong>
          <ul className="mt-1 list-disc pl-5">
            {run.thresholdViolations.map((v, i) => (
              <li key={i}>{v}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
};

const Tile = ({
  icon: Icon,
  label,
  value,
  tone = "default",
  testId,
}: {
  icon: any;
  label: string;
  value: number | string;
  tone?: "default" | "success" | "danger" | "amber";
  testId: string;
}) => {
  const tones: Record<string, string> = {
    default: "text-text-primary",
    success: "text-success",
    danger: "text-danger",
    amber: "text-amber-400",
  };
  return (
    <div
      data-testid={testId}
      className="rounded-lg border border-border/60 bg-surface/40 p-3"
    >
      <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div
        className={cn(
          "truncate text-base font-semibold tracking-tight",
          tones[tone],
        )}
      >
        {value}
      </div>
    </div>
  );
};
