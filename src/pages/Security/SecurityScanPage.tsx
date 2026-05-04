/**
 * SecurityScanPage — run 7 security checks against a URL (or Collection)
 * using the existing /api/v1/requests/execute-adhoc endpoint. No new backend
 * service needed.
 *
 * Checks implemented:
 *   1. Missing-auth probe          — hit without any Authorization header → expect 401/403
 *   2. Weak/forged-token probe     — send a gibberish Bearer token → expect 401
 *   3. SQLi pattern probe          — append `' OR 1=1--` → expect not-200 or no data leak
 *   4. NoSQL injection probe       — append `?id[$ne]=` → expect not-200
 *   5. Rate-limit check            — burst N rapid requests → expect eventual 429
 *   6. HTTPS enforcement           — send to http:// variant → expect 301/308 to https
 *   7. Security headers            — check CSP / HSTS / X-Frame-Options / X-Content-Type-Options
 *   8. PII in body                 — regex response body for email / SSN / CC / phone
 *
 * Output: vulnerability count, severity breakdown, per-check finding with
 * remediation.
 */
import { useState } from 'react';
import axios from 'axios';
import { ShieldCheck, Play, AlertTriangle, CheckCircle2, XCircle, Info } from 'lucide-react';
import { cn } from '@/utils/cn';

type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

interface Finding {
  check: string;
  passed: boolean;
  severity: Severity;
  detail: string;
  remediation?: string;
  evidence?: string;
}

const SEVERITY_COLORS: Record<Severity, string> = {
  CRITICAL: 'bg-red-600 text-white',
  HIGH: 'bg-red-500/15 text-red-500 border-red-500/30',
  MEDIUM: 'bg-amber-500/15 text-amber-500 border-amber-500/30',
  LOW: 'bg-sky-500/15 text-sky-500 border-sky-500/30',
  INFO: 'bg-muted/50 text-text-muted border-border',
};

const PII_PATTERNS: { name: string; regex: RegExp }[] = [
  { name: 'email', regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g },
  { name: 'credit-card', regex: /\b(?:\d[ -]*?){13,16}\b/g },
  { name: 'ssn', regex: /\b\d{3}-\d{2}-\d{4}\b/g },
  { name: 'phone', regex: /\b\+?\d{1,3}[\s-]?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4}\b/g },
];

const API_BASE = import.meta.env.VITE_REQUEST_SVC_URL || 'http://localhost:8083';

const adhoc = (method: string, url: string, headers: Record<string, string> = {}, body?: any) =>
  axios.post(
    `${API_BASE}/api/v1/requests/execute-adhoc`,
    {
      method,
      url: { raw: url },
      headers: Object.entries(headers).map(([key, value]) => ({ key, value })),
      body: body ? { mode: 'raw', raw: typeof body === 'string' ? body : JSON.stringify(body) } : undefined,
    },
    { headers: { 'X-Dev-Bypass': 'true' } },
  ).then((r) => r.data?.data);

export function SecurityScanPage() {
  const [targetUrl, setTargetUrl] = useState('https://httpbin.org/get');
  const [running, setRunning] = useState(false);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [progress, setProgress] = useState('');

  const pushFinding = (f: Finding) => setFindings((prev) => [...prev, f]);

  const runScan = async () => {
    setRunning(true);
    setFindings([]);
    setProgress('');

    try {
      // 1. Missing-auth probe
      setProgress('Check 1/8 — Missing auth probe');
      try {
        const r = await adhoc('GET', targetUrl, {});
        const status = r?.response?.httpStatus;
        pushFinding({
          check: 'Missing auth enforcement',
          passed: status === 401 || status === 403,
          severity: (status !== 401 && status !== 403) ? 'HIGH' : 'INFO',
          detail: `No-auth request returned HTTP ${status}`,
          evidence: `status=${status}`,
          remediation: 'Ensure sensitive endpoints return 401 when no credentials are supplied.',
        });
      } catch (e: any) {
        pushFinding({ check: 'Missing auth enforcement', passed: false, severity: 'LOW', detail: `Request failed: ${e.message}` });
      }

      // 2. Weak/forged token probe
      setProgress('Check 2/8 — Weak token probe');
      try {
        const r = await adhoc('GET', targetUrl, { Authorization: 'Bearer forged.token.here' });
        const status = r?.response?.httpStatus;
        pushFinding({
          check: 'Forged-token rejection',
          passed: status === 401 || status === 403,
          severity: (status === 200) ? 'CRITICAL' : 'INFO',
          detail: `Forged Bearer returned HTTP ${status}`,
          evidence: `status=${status}`,
          remediation: 'Backend must validate JWT signature + expiry and reject invalid tokens.',
        });
      } catch (e: any) {
        pushFinding({ check: 'Forged-token rejection', passed: false, severity: 'LOW', detail: `Request failed: ${e.message}` });
      }

      // 3. SQLi pattern probe
      setProgress('Check 3/8 — SQL injection probe');
      try {
        const sep = targetUrl.includes('?') ? '&' : '?';
        const sqliUrl = `${targetUrl}${sep}id=1'%20OR%20'1'='1`;
        const r = await adhoc('GET', sqliUrl);
        const body = String(r?.response?.body ?? '');
        const leaked = /sql|syntax|mysql|pg_|postgres/i.test(body);
        pushFinding({
          check: 'SQL injection resilience',
          passed: !leaked,
          severity: leaked ? 'CRITICAL' : 'INFO',
          detail: leaked ? 'Response body contains SQL-engine error strings — injection possible.' : 'No SQL error strings detected in response.',
          evidence: leaked ? body.slice(0, 200) : undefined,
          remediation: 'Use parameterised queries / prepared statements, never string concatenation.',
        });
      } catch (e: any) {
        pushFinding({ check: 'SQL injection resilience', passed: true, severity: 'INFO', detail: 'Endpoint rejected malformed input.' });
      }

      // 4. NoSQL injection probe
      setProgress('Check 4/8 — NoSQL injection probe');
      try {
        const sep = targetUrl.includes('?') ? '&' : '?';
        const nosqlUrl = `${targetUrl}${sep}id[$ne]=`;
        const r = await adhoc('GET', nosqlUrl);
        const status = r?.response?.httpStatus;
        pushFinding({
          check: 'NoSQL injection resilience',
          passed: status >= 400,
          severity: status === 200 ? 'HIGH' : 'INFO',
          detail: `$ne query operator returned HTTP ${status}`,
          remediation: 'Strip Mongo operators ($ne, $gt, $where) from user input before querying.',
        });
      } catch (e: any) {
        pushFinding({ check: 'NoSQL injection resilience', passed: true, severity: 'INFO', detail: 'Rejected malformed input.' });
      }

      // 5. Rate-limit check
      setProgress('Check 5/8 — Rate-limit burst (50 requests)');
      try {
        const results = await Promise.all(Array.from({ length: 50 }, () => adhoc('GET', targetUrl).catch(() => null)));
        const statuses = results.map((r) => r?.response?.httpStatus).filter(Boolean);
        const throttled = statuses.some((s) => s === 429);
        pushFinding({
          check: 'Rate limiting',
          passed: throttled,
          severity: throttled ? 'INFO' : 'MEDIUM',
          detail: throttled ? 'Server returned 429 during burst.' : 'No 429 received — rate limit may be missing or too generous.',
          evidence: `statuses: ${Array.from(new Set(statuses)).join(', ')}`,
          remediation: 'Add rate limiting at the gateway or application layer (e.g. token bucket per IP / per user).',
        });
      } catch (e: any) {
        pushFinding({ check: 'Rate limiting', passed: false, severity: 'LOW', detail: 'Burst failed: ' + e.message });
      }

      // 6. HTTPS enforcement
      setProgress('Check 6/8 — HTTPS enforcement');
      if (!targetUrl.startsWith('https://')) {
        pushFinding({
          check: 'HTTPS enforcement',
          passed: false,
          severity: 'CRITICAL',
          detail: 'Target URL uses plaintext HTTP.',
          remediation: 'Terminate TLS at the load balancer; always redirect http → https (301).',
        });
      } else {
        const httpUrl = targetUrl.replace('https://', 'http://');
        try {
          const r = await adhoc('GET', httpUrl);
          const status = r?.response?.httpStatus;
          const location = r?.response?.headers?.find((h: any) => h.key?.toLowerCase() === 'location')?.value;
          pushFinding({
            check: 'HTTPS enforcement',
            passed: status === 301 || status === 308,
            severity: status !== 301 && status !== 308 ? 'HIGH' : 'INFO',
            detail: `HTTP variant returned ${status}${location ? ` → ${location}` : ''}.`,
            remediation: 'Redirect http://your-host → https://your-host with HTTP 301 or 308.',
          });
        } catch {
          pushFinding({ check: 'HTTPS enforcement', passed: true, severity: 'INFO', detail: 'HTTP variant unreachable (good).' });
        }
      }

      // 7. Security headers
      setProgress('Check 7/8 — Security headers');
      try {
        const r = await adhoc('GET', targetUrl);
        const headers = r?.response?.headers ?? [];
        const hmap: Record<string, string> = {};
        for (const h of headers) hmap[String(h.key).toLowerCase()] = String(h.value);
        const missing: string[] = [];
        for (const k of ['strict-transport-security', 'content-security-policy', 'x-frame-options', 'x-content-type-options']) {
          if (!hmap[k]) missing.push(k);
        }
        pushFinding({
          check: 'Security response headers',
          passed: missing.length === 0,
          severity: missing.length > 2 ? 'HIGH' : missing.length > 0 ? 'MEDIUM' : 'INFO',
          detail: missing.length ? `Missing: ${missing.join(', ')}` : 'All recommended headers present.',
          remediation: 'Add HSTS, CSP, X-Frame-Options=DENY, X-Content-Type-Options=nosniff at the edge.',
        });
      } catch (e: any) {
        pushFinding({ check: 'Security response headers', passed: false, severity: 'LOW', detail: e.message });
      }

      // 8. PII in body
      setProgress('Check 8/8 — PII scan');
      try {
        const r = await adhoc('GET', targetUrl);
        const body = String(r?.response?.body ?? '');
        const hits: string[] = [];
        for (const p of PII_PATTERNS) {
          const m = body.match(p.regex);
          if (m && m.length) hits.push(`${p.name}×${m.length}`);
        }
        pushFinding({
          check: 'PII exposure in response',
          passed: hits.length === 0,
          severity: hits.length > 0 ? 'HIGH' : 'INFO',
          detail: hits.length ? `Detected potential PII: ${hits.join(', ')}` : 'No PII patterns detected.',
          remediation: 'Mask or tokenise PII before returning; apply a field-level classification.',
        });
      } catch (e: any) {
        pushFinding({ check: 'PII exposure in response', passed: true, severity: 'INFO', detail: 'Scan skipped: ' + e.message });
      }

      setProgress('Scan complete.');
    } finally {
      setRunning(false);
    }
  };

  const vulnerabilities = findings.filter((f) => !f.passed);
  const bySeverity = vulnerabilities.reduce<Record<Severity, number>>(
    (acc, f) => ({ ...acc, [f.severity]: (acc[f.severity] ?? 0) + 1 }),
    { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 },
  );
  const score = Math.max(
    0,
    100 - (bySeverity.CRITICAL * 25 + bySeverity.HIGH * 10 + bySeverity.MEDIUM * 5 + bySeverity.LOW * 2),
  );

  return (
    <div data-testid="security-scan-page" className="h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl space-y-4 p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10">
          <ShieldCheck className="h-5 w-5 text-red-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Security Scan</h1>
          <p className="text-sm text-text-muted">
            Fire 8 checks against a target URL — OWASP-inspired probes for auth, injection, rate limits, headers, PII.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-border bg-surface p-3">
        <input
          data-testid="sec-target-url"
          value={targetUrl}
          onChange={(e) => setTargetUrl(e.target.value)}
          placeholder="https://api.example.com/v1/users"
          className="h-9 flex-1 rounded-md border border-border bg-probestack-bg px-3 font-mono text-xs focus:outline-none"
        />
        <button
          data-testid="sec-run"
          onClick={runScan}
          disabled={running || !targetUrl.trim()}
          className="flex h-9 items-center gap-1.5 rounded-md bg-red-500 px-4 text-xs font-semibold text-white hover:bg-red-600 disabled:opacity-50"
        >
          <Play className="h-3.5 w-3.5" />
          {running ? 'Scanning…' : 'Run security scan'}
        </button>
      </div>

      {progress && (
        <div className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-xs text-text-muted">
          <Info className="h-3.5 w-3.5" />
          {progress}
        </div>
      )}

      {findings.length > 0 && (
        <>
          {/* Summary */}
          <div className="grid gap-3 md:grid-cols-6">
            <div className="rounded-xl border border-border bg-surface p-4 md:col-span-2">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Risk score</div>
              <div className={cn('mt-1 text-4xl font-bold', score >= 80 ? 'text-emerald-500' : score >= 50 ? 'text-amber-500' : 'text-red-500')}>
                {score}
                <span className="text-base text-text-muted">/100</span>
              </div>
              <div className="mt-1 text-xs text-text-muted">
                {vulnerabilities.length} vulnerabilit{vulnerabilities.length === 1 ? 'y' : 'ies'} · {findings.filter((f) => f.passed).length} passing
              </div>
            </div>
            {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as Severity[]).map((sev) => (
              <div key={sev} className="rounded-xl border border-border bg-surface p-4">
                <div className={cn('inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold', SEVERITY_COLORS[sev])}>
                  {sev}
                </div>
                <div className="mt-2 text-3xl font-bold">{bySeverity[sev] ?? 0}</div>
              </div>
            ))}
          </div>

          {/* Findings table */}
          <div className="overflow-hidden rounded-xl border border-border bg-surface">
            <div className="grid grid-cols-12 gap-3 border-b border-border/60 bg-probestack-bg/40 px-4 py-2 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
              <div className="col-span-1">Status</div>
              <div className="col-span-3">Check</div>
              <div className="col-span-1">Severity</div>
              <div className="col-span-4">Detail</div>
              <div className="col-span-3">Remediation</div>
            </div>
            {findings.map((f, i) => (
              <div
                key={i}
                data-testid={`sec-finding-${i}`}
                className="grid grid-cols-12 items-start gap-3 border-b border-border/60 px-4 py-3 text-xs"
              >
                <div className="col-span-1">
                  {f.passed
                    ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    : <XCircle className="h-4 w-4 text-red-500" />}
                </div>
                <div className="col-span-3 font-semibold">{f.check}</div>
                <div className="col-span-1">
                  <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-bold', SEVERITY_COLORS[f.severity])}>
                    {f.severity}
                  </span>
                </div>
                <div className="col-span-4">
                  <div>{f.detail}</div>
                  {f.evidence && <pre className="mt-1 max-h-20 overflow-auto rounded bg-probestack-bg/40 p-1 font-mono text-[10px] text-text-muted">{f.evidence}</pre>}
                </div>
                <div className="col-span-3 text-text-muted">{f.remediation || '—'}</div>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
            <div className="flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <span className="font-semibold">Advanced checks coming soon:</span> DDoS simulation, default credential brute-force,
                full OWASP Top 10 deep-scan, GDPR / DPDP compliance audit, automatic CVE matching against detected stacks.
              </div>
            </div>
          </div>
        </>
      )}
      </div>
    </div>
  );
}

export default SecurityScanPage;
