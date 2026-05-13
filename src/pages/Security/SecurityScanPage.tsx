/**
 * SecurityScanPage — comprehensive security scan UI wired to the new
 * server-side orchestrator in `forgeq-functional-test-mgmt-svc`.
 *
 * Features end-to-end:
 *   • Target URL input + probe checklist + AI probe prompt
 *   • Start / Cancel buttons (server-side scan, async)
 *   • EventSource SSE consumer — progress bar, live probe-by-probe feed
 *   • ProbeTransparencyCard per finding (What+How+Endpoints+Evidence)
 *   • Notify developer (email) + Notify via Slack/Teams/Webhook
 *   • Create bug ticket from any finding (links back to scan run)
 *   • Export findings as JSON / CSV / SARIF
 *   • OWASP coverage strip (A01..A10 mapping at-a-glance)
 *   • AI Probe modal — Gemini generates a probe spec from prose
 *
 * Single page, ~600 lines — kept self-contained on purpose to make
 * the security flow easy to navigate.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import {
  ShieldCheck, Play, Square, AlertTriangle, CheckCircle2,
  Loader2, Sparkles, Download, Bug, Send, Slack,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { Tooltip } from '@/components/ui/Tooltip';
import { ProbeTransparencyCard, type ProbeResult } from '@/components/security/ProbeTransparencyCard';
import { NotifyDeveloperModal } from '@/components/security/NotifyDeveloperModal';
import { serviceUrl } from '@/lib/env';

type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
const SVC = serviceUrl('functionalTest');
const BASE = `${SVC}/api/v1/functional-tests/security`;

/** Human-readable labels for the OWASP API Security Top-10 (2023) — used as
 *  tooltip text on the coverage pills so security folks don't have to
 *  memorise the codes. */
const OWASP_LABELS: Record<string, string> = {
  'API1:2023':  'API1:2023 — Broken Object Level Authorization (BOLA / IDOR)',
  'API2:2023':  'API2:2023 — Broken Authentication',
  'API3:2023':  'API3:2023 — Broken Object Property Level Authorization (data exposure)',
  'API4:2023':  'API4:2023 — Unrestricted Resource Consumption (rate-limiting)',
  'API5:2023':  'API5:2023 — Broken Function Level Authorization',
  'API6:2023':  'API6:2023 — Unrestricted Access to Sensitive Business Flows',
  'API7:2023':  'API7:2023 — Server-Side Request Forgery (SSRF)',
  'API8:2023':  'API8:2023 — Security Misconfiguration',
  'API9:2023':  'API9:2023 — Improper Inventory Management',
  'API10:2023': 'API10:2023 — Unsafe Consumption of APIs',
  'CUSTOM':     'Custom probe (AI-generated or user-supplied)',
};

interface ProbeSpec {
  checkId: string;
  name: string;
  owaspId: string;
  defaultSeverity: Severity;
  whatItTests: string;
  howItWorks: string;
  remediation: string;
  intensive: boolean;
}

interface BackendFinding {
  findingId: string;
  checkId: string;
  name: string;
  passed: boolean;
  severity: Severity;
  detail: string;
  remediation?: string;
  evidence?: string;
  whatItTests: string;
  howItWorks: string;
  endpointsTested: string[];
  durationMs: number;
  linkedBugId?: string;
  notified?: boolean;
}

interface ScanRun {
  id: string;
  targetUrl: string;
  status: 'RUNNING' | 'DONE' | 'CANCELLED' | 'FAILED';
  startedAt: string;
  finishedAt?: string;
  findings: BackendFinding[];
  severeCount: number;
  error?: string;
  // Optional — populated by `scan-started` payloads on newer backend
  // builds. Older builds omit it, hence the `?`.
  probesRequested?: string[];
}

const toProbeResult = (f: BackendFinding): ProbeResult => ({
  checkId: f.checkId,
  name: f.name,
  passed: f.passed,
  severity: f.severity,
  detail: f.detail,
  remediation: f.remediation,
  evidence: f.evidence,
  whatItTests: f.whatItTests,
  howItWorks: f.howItWorks,
  endpointsTested: f.endpointsTested ?? [],
  durationMs: f.durationMs,
});

export function SecurityScanPage() {
  const [targetUrl, setTargetUrl] = useState('https://httpbin.org/get');
  const [probes, setProbes] = useState<ProbeSpec[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiSpec, setAiSpec] = useState<any>(null);
  const [aiBusy, setAiBusy] = useState(false);

  const [runId, setRunId] = useState<string | null>(null);
  const [status, setStatus] = useState<ScanRun['status'] | 'IDLE'>('IDLE');
  const [progress, setProgress] = useState<{ done: number; total: number; current?: string }>({ done: 0, total: 0 });
  const [findings, setFindings] = useState<BackendFinding[]>([]);
  const [timeline, setTimeline] = useState<{ t: number; msg: string }[]>([]);
  const evtRef = useRef<EventSource | null>(null);

  const [notifyFor, setNotifyFor] = useState<ProbeResult | null>(null);
  const [webhookFor, setWebhookFor] = useState<BackendFinding | null>(null);
  const [bugBusyId, setBugBusyId] = useState<string | null>(null);

  // Load probe catalog on mount
  useEffect(() => {
    axios.get<ProbeSpec[]>(`${BASE}/probes`).then((r) => {
      const list = r.data;
      setProbes(list);
      // Pre-select all except AI-custom by default.
      setSelected(new Set(list.filter((p) => p.checkId !== 'ai-custom').map((p) => p.checkId)));
    }).catch(() => { /* offline ok */ });
    return () => { evtRef.current?.close(); };
  }, []);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const start = async () => {
    if (!targetUrl.trim()) return;
    setFindings([]);
    setTimeline([]);
    setProgress({ done: 0, total: selected.size });
    setStatus('RUNNING');
    try {
      const r = await axios.post<{ runId: string }>(`${BASE}/scan/start`, {
        targetUrl,
        probes: Array.from(selected),
        aiProbePrompt: selected.has('ai-custom') ? aiPrompt : undefined,
      });
      const id = r.data.runId;
      setRunId(id);
      openStream(id);
    } catch (e: any) {
      setStatus('FAILED');
      pushTimeline('Failed to start: ' + (e?.message ?? 'unknown'));
    }
  };

  const cancel = async () => {
    if (!runId) return;
    await axios.post(`${BASE}/scan/${runId}/cancel`);
    pushTimeline('Cancel requested');
  };

  const openStream = (id: string) => {
    evtRef.current?.close();
    const es = new EventSource(`${BASE}/scan/${id}/stream`);
    evtRef.current = es;
    // Snapshot — sent immediately on connect with whatever state the
    // run is already in. Used to recover after a network blip or a late
    // subscribe (Cloudflare cold-start, etc.).
    es.addEventListener('snapshot', (ev: MessageEvent) => {
      const r: ScanRun = JSON.parse(ev.data);
      // Backfill any findings that fired before we subscribed.
      setFindings((prev) => {
        const seen = new Set(prev.map((p) => p.findingId));
        const fresh = (r.findings ?? []).filter((f) => !seen.has(f.findingId));
        return fresh.length ? [...prev, ...fresh] : prev;
      });
      const total = r.probesRequested?.length || progress.total || (r.findings?.length ?? 0);
      setProgress((p) => ({ ...p, total: total || p.total, done: Math.max(p.done, r.findings?.length ?? 0) }));
      if (r.status !== 'RUNNING') {
        setStatus(r.status);
      }
    });
    es.addEventListener('scan-started', (ev: MessageEvent) => {
      const d = JSON.parse(ev.data);
      setProgress((p) => ({ ...p, total: d.total, done: 0 }));
      pushTimeline(`Scan started — ${d.total} probes`);
    });
    es.addEventListener('probe-started', (ev: MessageEvent) => {
      const d = JSON.parse(ev.data);
      setProgress((p) => ({ ...p, current: d.name, total: d.total ?? p.total }));
      pushTimeline(`▶ ${d.name}`);
    });
    es.addEventListener('probe-finished', (ev: MessageEvent) => {
      const f: BackendFinding = JSON.parse(ev.data);
      setFindings((prev) => prev.some((x) => x.findingId === f.findingId) ? prev : [...prev, f]);
      setProgress((p) => ({ ...p, done: p.done + 1 }));
      pushTimeline(`${f.passed ? '✓' : '✗'} ${f.name} (${f.durationMs}ms)`);
    });
    es.addEventListener('scan-done', (ev: MessageEvent) => {
      const r: ScanRun = JSON.parse(ev.data);
      setStatus('DONE');
      setFindings(r.findings);
      setProgress((p) => ({ ...p, done: r.findings.length, total: r.findings.length || p.total }));
      pushTimeline('✓ Scan complete');
      es.close();
    });
    es.addEventListener('scan-cancelled', () => {
      setStatus('CANCELLED');
      pushTimeline('✗ Cancelled');
      es.close();
    });
    es.addEventListener('scan-failed', (ev: MessageEvent) => {
      const d = JSON.parse(ev.data);
      setStatus('FAILED');
      pushTimeline('✗ Failed: ' + (d.error ?? ''));
      es.close();
    });
    es.onerror = () => { /* keep trying — server may close on done */ };
  };

  const pushTimeline = (msg: string) =>
    setTimeline((p) => [...p, { t: Date.now(), msg }].slice(-50));

  const generateAi = async () => {
    if (!aiPrompt.trim()) return;
    setAiBusy(true);
    try {
      const r = await axios.post(`${BASE}/probes/ai`, { prompt: aiPrompt, targetUrl });
      setAiSpec(r.data);
    } catch (e: any) {
      setAiSpec({ error: e?.message ?? 'AI failed' });
    } finally { setAiBusy(false); }
  };

  const createBug = async (f: BackendFinding) => {
    if (!runId) return;
    setBugBusyId(f.findingId);
    try {
      const r = await axios.post(`${SVC}/api/v1/functional-tests/bugs/from-finding`, {
        runId, findingId: f.findingId, reporterEmail: 'qa@forgeq.io',
      });
      setFindings((prev) => prev.map((x) =>
        x.findingId === f.findingId ? { ...x, linkedBugId: r.data.id } : x));
      pushTimeline(`Bug created: ${r.data.id.slice(0, 8)}`);
    } finally { setBugBusyId(null); }
  };

  const exportJson = () => downloadBlob(JSON.stringify({ runId, targetUrl, findings }, null, 2), 'application/json', `scan-${runId}.json`);
  const exportCsv = () => {
    const rows = [['checkId', 'name', 'severity', 'passed', 'detail', 'remediation', 'durationMs']];
    for (const f of findings) rows.push([f.checkId, f.name, f.severity, String(f.passed), f.detail ?? '', f.remediation ?? '', String(f.durationMs)]);
    downloadBlob(rows.map((r) => r.map(csvCell).join(',')).join('\n'), 'text/csv', `scan-${runId}.csv`);
  };
  const exportSarif = () => {
    const sarif = {
      version: '2.1.0',
      $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
      runs: [{
        tool: { driver: { name: 'ForgeQ', version: '1.0.0', informationUri: 'https://forgeq.io' } },
        results: findings.filter((f) => !f.passed).map((f) => ({
          ruleId: f.checkId,
          message: { text: f.detail },
          level: f.severity === 'CRITICAL' || f.severity === 'HIGH' ? 'error' : f.severity === 'MEDIUM' ? 'warning' : 'note',
          locations: [{ physicalLocation: { artifactLocation: { uri: targetUrl } } }],
        })),
      }],
    };
    downloadBlob(JSON.stringify(sarif, null, 2), 'application/sarif+json', `scan-${runId}.sarif`);
  };

  const owaspCoverage = useMemo(() => {
    const map: Record<string, BackendFinding[]> = {};
    for (const f of findings) {
      const probe = probes.find((p) => p.checkId === f.checkId);
      const id = probe?.owaspId ?? 'OTHER';
      (map[id] = map[id] ?? []).push(f);
    }
    return map;
  }, [findings, probes]);

  const failsCount = findings.filter((f) => !f.passed).length;
  const sevCounts = findings.reduce<Record<string, number>>((acc, f) => {
    if (!f.passed) acc[f.severity] = (acc[f.severity] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="security-scan-page">
      {/* Sticky header — stays visible while findings scroll. */}
      <div className="flex shrink-0 flex-col gap-4 border-b border-border p-6 pb-4">
        <header className="flex items-center gap-3">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-xl font-semibold">Security Test</h1>
            <p className="text-xs text-text-muted">Run OWASP-mapped probes against any URL. Server-side execution with live progress.</p>
          </div>
        </header>

        {/* Target URL + Start/Cancel */}
        <div className="flex items-center gap-2">
          <input
            data-testid="scan-target-url"
            value={targetUrl}
            onChange={(e) => setTargetUrl(e.target.value)}
            placeholder="https://api.example.com/users"
            className="flex-1 rounded-md border border-border bg-transparent px-3 py-2 text-sm font-mono focus:border-primary focus:outline-none"
          />
          {status === 'RUNNING' ? (
            <button
              data-testid="scan-cancel-btn"
              onClick={cancel}
              className="flex items-center gap-2 rounded-md bg-red-500/15 px-4 py-2 text-sm font-semibold text-red-400 hover:bg-red-500/25"
            >
              <Square className="h-4 w-4" /> Cancel
            </button>
          ) : (
            <button
              data-testid="scan-start-btn"
              onClick={start}
              disabled={!targetUrl.trim() || selected.size === 0}
              className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
            >
              <Play className="h-4 w-4" /> Start test
            </button>
          )}
        </div>
      </div>

      {/* Scrollable content area. `h-0` is the flexbox-grow trick that
          forces this element to inherit available height from the flex
          parent instead of growing to fit content (which would defeat
          overflow-y-auto). */}
      <div
        className="flex h-0 min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-6 pt-4"
        data-testid="security-scan-scroll"
      >

      {/* Probe selector + AI probe */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-md border border-border p-3" data-testid="probe-selector">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">Probes ({selected.size} / {probes.length})</span>
            <div className="flex gap-1 text-[10px]">
              <button onClick={() => setSelected(new Set(probes.filter((p) => p.checkId !== 'ai-custom').map((p) => p.checkId)))} className="rounded px-2 py-0.5 hover:bg-hover">All</button>
              <button onClick={() => setSelected(new Set())} className="rounded px-2 py-0.5 hover:bg-hover">None</button>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {probes.map((p) => (
              <label key={p.checkId} className="flex items-start gap-2 rounded p-1.5 text-xs hover:bg-hover/30" data-testid={`probe-toggle-${p.checkId}`}>
                <input type="checkbox" checked={selected.has(p.checkId)} onChange={() => toggle(p.checkId)} className="mt-0.5 accent-[var(--color-primary)]" />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate font-medium text-text-primary">{p.name}</span>
                    <span className="rounded border border-border px-1 py-0 text-[9px] text-text-muted">{p.owaspId}</span>
                  </div>
                  <div className="truncate text-[10px] text-text-muted">{p.whatItTests}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="rounded-md border border-border p-3" data-testid="ai-probe-panel">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-text-secondary">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> AI custom probe
          </div>
          <textarea
            data-testid="ai-probe-prompt"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="Describe what to test, e.g. check if /admin is publicly accessible"
            rows={3}
            className="w-full rounded border border-border bg-transparent p-2 text-xs"
          />
          <button
            data-testid="ai-probe-generate"
            onClick={generateAi}
            disabled={aiBusy || !aiPrompt.trim()}
            className="mt-2 w-full rounded bg-primary/15 px-2 py-1.5 text-xs font-medium text-primary hover:bg-primary/25 disabled:opacity-50"
          >
            {aiBusy ? <Loader2 className="mr-1 inline h-3 w-3 animate-spin" /> : <Sparkles className="mr-1 inline h-3 w-3" />}
            Generate probe spec
          </button>
          {aiSpec && (
            <pre data-testid="ai-probe-spec" className="mt-2 max-h-32 overflow-auto rounded bg-elevated p-2 text-[10px] font-mono text-text-muted">
              {JSON.stringify(aiSpec, null, 2)}
            </pre>
          )}
        </div>
      </div>

      {/* Progress bar + timeline */}
      {status !== 'IDLE' && (
        <div className="rounded-md border border-border p-3" data-testid="scan-progress">
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="font-semibold">{status} {progress.current ? `· ${progress.current}` : ''}</span>
            <span className="text-text-muted">{progress.done} / {progress.total}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded bg-elevated">
            <div className="h-full bg-primary transition-all" style={{ width: progress.total ? `${(progress.done / progress.total) * 100}%` : '0%' }} />
          </div>
          {timeline.length > 0 && (
            <details className="mt-2 text-[10px]" data-testid="scan-timeline">
              <summary className="cursor-pointer text-text-muted">Timeline ({timeline.length} events)</summary>
              <ul className="mt-1 max-h-32 overflow-auto font-mono text-text-muted">
                {timeline.map((e, i) => <li key={i}>{new Date(e.t).toLocaleTimeString()} — {e.msg}</li>)}
              </ul>
            </details>
          )}
        </div>
      )}

      {/* Summary chips */}
      {findings.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-xs" data-testid="scan-summary">
          <Pill label="Findings" value={findings.length} tone="muted" />
          <Pill label="Failures" value={failsCount} tone={failsCount ? 'red' : 'muted'} />
          {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((s) =>
            sevCounts[s] ? <Pill key={s} label={s} value={sevCounts[s]} tone={s === 'CRITICAL' ? 'red' : s === 'HIGH' ? 'red' : s === 'MEDIUM' ? 'amber' : 'sky'} /> : null)}
          <div className="ml-auto flex gap-1">
            <button data-testid="export-json-btn" onClick={exportJson} className="flex items-center gap-1 rounded border border-border px-2 py-1 text-[11px] hover:bg-hover">
              <Download className="h-3 w-3" /> JSON
            </button>
            <button data-testid="export-csv-btn" onClick={exportCsv} className="flex items-center gap-1 rounded border border-border px-2 py-1 text-[11px] hover:bg-hover">
              <Download className="h-3 w-3" /> CSV
            </button>
            <button data-testid="export-sarif-btn" onClick={exportSarif} className="flex items-center gap-1 rounded border border-border px-2 py-1 text-[11px] hover:bg-hover">
              <Download className="h-3 w-3" /> SARIF
            </button>
          </div>
        </div>
      )}

      {/* OWASP coverage strip */}
      {findings.length > 0 && (
        <div className="rounded-md border border-border p-2 text-[11px]" data-testid="owasp-strip">
          <div className="mb-1 font-semibold text-text-muted">OWASP coverage</div>
          <div className="flex flex-wrap gap-1">
            {Object.entries(owaspCoverage).map(([id, list]) => {
              const failed = list.filter((f) => !f.passed).length;
              return (
                <Tooltip key={id} content={OWASP_LABELS[id] ?? id}>
                  <span
                    data-testid={`owasp-pill-${id}`}
                    className={cn(
                      'cursor-help rounded border px-2 py-0.5 transition-colors',
                      failed ? 'border-red-500/30 bg-red-500/10 text-red-400' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                    )}>
                    {id} · {list.length - failed}/{list.length} pass
                  </span>
                </Tooltip>
              );
            })}
          </div>
        </div>
      )}

      {/* Findings cards */}
      <div className="flex flex-col gap-2" data-testid="scan-findings">
        {findings.map((f) => (
          <div key={f.findingId} className="relative">
            <ProbeTransparencyCard result={toProbeResult(f)} onNotify={() => setNotifyFor(toProbeResult(f))} />
            {!f.passed && (
              <div className="flex items-center gap-2 px-4 py-1.5 text-[11px] border-t border-border bg-elevated/30 rounded-b-lg">
                <button
                  data-testid={`finding-create-bug-${f.checkId}`}
                  onClick={() => createBug(f)}
                  disabled={!!f.linkedBugId || bugBusyId === f.findingId}
                  className="flex items-center gap-1 rounded px-2 py-0.5 hover:bg-hover disabled:opacity-50"
                >
                  {bugBusyId === f.findingId
                    ? <Loader2 className="h-3 w-3 animate-spin" />
                    : <Bug className="h-3 w-3" />}
                  {f.linkedBugId ? `Bug ${f.linkedBugId.slice(0, 8)}` : 'Create bug'}
                </button>
                <button
                  data-testid={`finding-webhook-${f.checkId}`}
                  onClick={() => setWebhookFor(f)}
                  className="flex items-center gap-1 rounded px-2 py-0.5 hover:bg-hover"
                >
                  <Slack className="h-3 w-3" /> Notify via Slack/Teams
                </button>
                {f.notified && <span className="text-emerald-400">· notified</span>}
              </div>
            )}
          </div>
        ))}
        {findings.length === 0 && status === 'IDLE' && (
          <div className="rounded-md border border-dashed border-border p-8 text-center text-sm text-text-muted">
            Enter a URL, choose probes, hit Start.
          </div>
        )}
      </div>

      {notifyFor && (
        <NotifyDeveloperModal
          finding={notifyFor}
          scannedUrl={targetUrl}
          onClose={() => setNotifyFor(null)}
        />
      )}
      {webhookFor && runId && (
        <WebhookNotifyModal
          runId={runId}
          finding={webhookFor}
          onClose={() => setWebhookFor(null)}
          onSent={() => {
            setFindings((p) => p.map((x) => x.findingId === webhookFor.findingId ? { ...x, notified: true } : x));
          }}
        />
      )}
      </div>  {/* end of scrollable content */}
    </div>
  );
}

function Pill({ label, value, tone }: { label: string; value: number | string; tone: 'red' | 'amber' | 'sky' | 'muted' }) {
  const tones = {
    red: 'border-red-500/30 bg-red-500/10 text-red-400',
    amber: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
    sky: 'border-sky-500/30 bg-sky-500/10 text-sky-400',
    muted: 'border-border bg-elevated text-text-muted',
  };
  return <span className={cn('inline-flex items-center gap-1 rounded border px-2 py-0.5', tones[tone])}><b>{value}</b>{label}</span>;
}

function downloadBlob(content: string, mime: string, filename: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function csvCell(s: string) {
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

// ── Slack/Teams/Webhook notify modal ─────────────────────────────────
function WebhookNotifyModal({ runId, finding, onClose, onSent }: {
  runId: string; finding: BackendFinding; onClose: () => void; onSent: () => void;
}) {
  const [kind, setKind] = useState<'SLACK' | 'TEAMS' | 'WEBHOOK'>('SLACK');
  const [target, setTarget] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const send = async () => {
    setBusy(true);
    try {
      const r = await axios.post(`${BASE}/findings/notify-webhook`, {
        runId,
        findingId: finding.findingId,
        destinations: [{ kind, target }],
        note,
      });
      setResult(`Delivered ${r.data.delivered}, failed ${r.data.failed}`);
      if (r.data.delivered > 0) onSent();
    } catch (e: any) {
      setResult(e?.response?.data?.message ?? e?.message ?? 'Failed');
    } finally { setBusy(false); }
  };

  return (
    <div data-testid="webhook-notify-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl border border-border bg-background-elevated p-5" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-3 text-sm font-semibold">Notify via webhook</h2>
        <div className="space-y-2 text-xs">
          <label className="block">
            <span className="text-text-muted">Destination</span>
            <select
              data-testid="webhook-kind"
              value={kind} onChange={(e) => setKind(e.target.value as any)}
              className="mt-1 w-full rounded border border-border bg-transparent px-2 py-1"
            >
              <option value="SLACK">Slack incoming webhook</option>
              <option value="TEAMS">Microsoft Teams webhook</option>
              <option value="WEBHOOK">Generic JSON webhook</option>
            </select>
          </label>
          <label className="block">
            <span className="text-text-muted">URL</span>
            <input
              data-testid="webhook-target"
              value={target} onChange={(e) => setTarget(e.target.value)}
              placeholder="https://hooks.slack.com/services/..."
              className="mt-1 w-full rounded border border-border bg-transparent px-2 py-1 font-mono"
            />
          </label>
          <label className="block">
            <span className="text-text-muted">Note (optional)</span>
            <textarea
              data-testid="webhook-note"
              value={note} onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded border border-border bg-transparent px-2 py-1"
            />
          </label>
          {result && <div data-testid="webhook-result" className="rounded border border-border p-2 text-[11px]">{result}</div>}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded border border-border px-3 py-1 text-xs">Cancel</button>
          <button
            data-testid="webhook-send-btn"
            onClick={send}
            disabled={busy || !target.trim()}
            className="flex items-center gap-1 rounded bg-primary px-3 py-1 text-xs text-white disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />} Send
          </button>
        </div>
      </div>
    </div>
  );
}

export default SecurityScanPage;
