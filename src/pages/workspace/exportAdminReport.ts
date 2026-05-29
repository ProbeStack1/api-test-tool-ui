/**
 * exportAdminReport — generate a printable / downloadable enterprise
 * admin report for the current workspace. Three formats supported:
 *
 *   • PDF   — opens an OS print dialog; user picks "Save as PDF"
 *   • HTML  — downloads a single self-contained .html file
 *   • CSV   — three CSVs zipped into a single .csv (members / audit / runs)
 *
 * Zero new bundle deps — follows the same in-browser strategy as
 * `exportSecurityPDF.ts`.
 */

interface MemberRow {
  email: string;
  name: string;
  role: string;
  joinedAt?: string;
}

interface ActivityRow {
  timestamp?: string | number;
  actorEmail?: string;
  action: string;
  resource?: string;
  service?: string;
  statusCode?: number | null;
  severity?: string;
}

export interface AdminReportData {
  workspaceName: string;
  workspaceId: string;
  generatedAt: string;
  generatedBy?: string;
  totals: {
    members: number;
    owners: number;
    admins: number;
    editors: number;
    viewers: number;
    activities30d: number;
    requests?: number;
    collections?: number;
    monitorRuns?: number;
    functionalRuns?: number;
    loadRuns?: number;
  };
  members: MemberRow[];
  activity: ActivityRow[];
  perMemberActivity: { email: string; events: number }[];
  perActionBreakdown: { action: string; count: number }[];
}

const escapeHtml = (s: unknown): string => {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
};

const csvEscape = (s: unknown): string => {
  const str = s === null || s === undefined ? '' : String(s);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
};

const fmtDate = (v?: string | number | null): string => {
  if (v === null || v === undefined || v === '') return '—';
  try {
    return new Date(v).toLocaleString();
  } catch { return String(v); }
};

const roleColor: Record<string, string> = {
  OWNER:  '#7c3aed',
  ADMIN:  '#2563eb',
  EDITOR: '#059669',
  VIEWER: '#6b7280',
};

const sevColor: Record<string, string> = {
  CRITICAL: '#b91c1c',
  ERROR:    '#dc2626',
  WARN:     '#d97706',
  INFO:     '#0284c7',
};

/* ────────────────────────── HTML renderer ─────────────────────────────── */

function buildHtml(d: AdminReportData): string {
  const memberRowsHtml = d.members.map((m) => `
    <tr>
      <td>${escapeHtml(m.name || '—')}</td>
      <td><span class="mono">${escapeHtml(m.email)}</span></td>
      <td><span class="badge" style="background:${roleColor[m.role] || '#475569'}20;color:${roleColor[m.role] || '#475569'};">${escapeHtml(m.role)}</span></td>
      <td>${escapeHtml(fmtDate(m.joinedAt))}</td>
    </tr>
  `).join('');

  const activityRowsHtml = d.activity.slice(0, 100).map((a) => `
    <tr>
      <td class="mono small">${escapeHtml(fmtDate(a.timestamp))}</td>
      <td class="mono small">${escapeHtml(a.actorEmail || 'system')}</td>
      <td><span class="badge" style="background:${(sevColor[a.severity || 'INFO'] || '#0284c7')}20;color:${sevColor[a.severity || 'INFO'] || '#0284c7'};">${escapeHtml(a.severity || 'INFO')}</span></td>
      <td>${escapeHtml(a.action)}</td>
      <td>${escapeHtml(a.resource || '')}</td>
      <td>${escapeHtml(a.service || '')}</td>
      <td>${a.statusCode ?? ''}</td>
    </tr>
  `).join('');

  const perMemberRowsHtml = d.perMemberActivity.map((m) => `
    <tr>
      <td class="mono">${escapeHtml(m.email)}</td>
      <td style="text-align:right;font-weight:600;">${m.events.toLocaleString()}</td>
    </tr>
  `).join('');

  const perActionRowsHtml = d.perActionBreakdown.slice(0, 20).map((a) => `
    <tr>
      <td class="mono small">${escapeHtml(a.action)}</td>
      <td style="text-align:right;font-weight:600;">${a.count.toLocaleString()}</td>
    </tr>
  `).join('');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Admin Report · ${escapeHtml(d.workspaceName)}</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
         color: #0f172a; background: #ffffff; margin: 0; padding: 32px 40px; line-height: 1.5; }
  h1 { font-size: 26px; margin: 0 0 4px; letter-spacing: -0.5px; }
  h2 { font-size: 16px; margin: 28px 0 10px; padding-bottom: 6px; border-bottom: 2px solid #e2e8f0;
       text-transform: uppercase; letter-spacing: 0.08em; color: #334155; font-weight: 700; }
  .meta { color: #64748b; font-size: 12px; margin-bottom: 24px; }
  .meta span { margin-right: 16px; }
  .kpi-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-bottom: 18px; }
  .kpi { border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; background: linear-gradient(180deg,#fafbff,#fff); }
  .kpi .lbl { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600; }
  .kpi .val { font-size: 22px; font-weight: 700; color: #0f172a; margin-top: 2px; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em;
       color: #64748b; padding: 8px 10px; border-bottom: 2px solid #e2e8f0; background: #f8fafc; }
  td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
  tbody tr:nth-child(even) { background: #fafbfc; }
  .mono { font-family: 'SF Mono', 'JetBrains Mono', Consolas, monospace; font-size: 11px; }
  .small { font-size: 10px; color: #475569; }
  .badge { display: inline-block; padding: 2px 7px; border-radius: 10px; font-size: 10px; font-weight: 600;
           letter-spacing: 0.03em; text-transform: uppercase; }
  .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 10px;
            display: flex; justify-content: space-between; }
  @media print {
    body { padding: 18mm 14mm; }
    h2 { page-break-after: avoid; }
    tr { page-break-inside: avoid; }
    .no-print { display: none !important; }
  }
</style>
</head>
<body>
  <h1>${escapeHtml(d.workspaceName)} — Admin Report</h1>
  <div class="meta">
    <span>Workspace ID: <span class="mono">${escapeHtml(d.workspaceId)}</span></span>
    <span>Generated: ${escapeHtml(d.generatedAt)}</span>
    ${d.generatedBy ? `<span>By: ${escapeHtml(d.generatedBy)}</span>` : ''}
  </div>

  <h2>Workspace at a glance</h2>
  <div class="kpi-grid">
    <div class="kpi"><div class="lbl">Members</div><div class="val">${d.totals.members}</div></div>
    <div class="kpi"><div class="lbl">Owners</div><div class="val">${d.totals.owners}</div></div>
    <div class="kpi"><div class="lbl">Admins</div><div class="val">${d.totals.admins}</div></div>
    <div class="kpi"><div class="lbl">Editors</div><div class="val">${d.totals.editors}</div></div>
    <div class="kpi"><div class="lbl">Viewers</div><div class="val">${d.totals.viewers}</div></div>
    <div class="kpi"><div class="lbl">Activity (30d)</div><div class="val">${d.totals.activities30d.toLocaleString()}</div></div>
    ${d.totals.requests != null ? `<div class="kpi"><div class="lbl">Requests</div><div class="val">${d.totals.requests}</div></div>` : ''}
    ${d.totals.collections != null ? `<div class="kpi"><div class="lbl">Collections</div><div class="val">${d.totals.collections}</div></div>` : ''}
    ${d.totals.monitorRuns != null ? `<div class="kpi"><div class="lbl">Monitor runs</div><div class="val">${d.totals.monitorRuns}</div></div>` : ''}
    ${d.totals.functionalRuns != null ? `<div class="kpi"><div class="lbl">Functional runs</div><div class="val">${d.totals.functionalRuns}</div></div>` : ''}
    ${d.totals.loadRuns != null ? `<div class="kpi"><div class="lbl">Load runs</div><div class="val">${d.totals.loadRuns}</div></div>` : ''}
  </div>

  <h2>Members &amp; access</h2>
  <table>
    <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th></tr></thead>
    <tbody>${memberRowsHtml || '<tr><td colspan="4" style="text-align:center;color:#94a3b8;">No members</td></tr>'}</tbody>
  </table>

  <div class="grid-2" style="margin-top:16px;">
    <div>
      <h2>Activity per member</h2>
      <table>
        <thead><tr><th>Email</th><th style="text-align:right;">Events</th></tr></thead>
        <tbody>${perMemberRowsHtml || '<tr><td colspan="2" style="text-align:center;color:#94a3b8;">No activity</td></tr>'}</tbody>
      </table>
    </div>
    <div>
      <h2>Top actions</h2>
      <table>
        <thead><tr><th>Action</th><th style="text-align:right;">Count</th></tr></thead>
        <tbody>${perActionRowsHtml || '<tr><td colspan="2" style="text-align:center;color:#94a3b8;">No actions</td></tr>'}</tbody>
      </table>
    </div>
  </div>

  <h2>Recent activity (last 100)</h2>
  <table>
    <thead><tr><th>Time</th><th>Actor</th><th>Severity</th><th>Action</th><th>Resource</th><th>Service</th><th>HTTP</th></tr></thead>
    <tbody>${activityRowsHtml || '<tr><td colspan="7" style="text-align:center;color:#94a3b8;">No recorded activity</td></tr>'}</tbody>
  </table>

  <div class="footer">
    <span>ForgeFuzz Admin Report · v1</span>
    <span>Page generated client-side · workspace-scoped</span>
  </div>
</body>
</html>`;
}

/* ────────────────────────── Exporters ─────────────────────────────────── */

/** Open a print-only iframe so the OS dialog can save it as PDF. */
export function exportAdminReportPDF(d: AdminReportData): void {
  const html = buildHtml(d);
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0'; iframe.style.bottom = '0';
  iframe.style.width = '0';  iframe.style.height = '0';
  iframe.style.border = '0'; iframe.style.opacity = '0';
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument!;
  doc.open(); doc.write(html); doc.close();
  // Give browser one tick to render before printing.
  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } finally {
      // Remove after a delay so print dialog has time to read DOM.
      setTimeout(() => iframe.remove(), 1000);
    }
  }, 300);
}

/** Download a single self-contained .html file. */
export function exportAdminReportHTML(d: AdminReportData): void {
  const html = buildHtml(d);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `admin-report-${d.workspaceId.slice(0, 8)}-${Date.now()}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
}

/** Download a single CSV (combined: members + activity + per-member). */
export function exportAdminReportCSV(d: AdminReportData): void {
  const lines: string[] = [];
  lines.push(`# Admin Report — ${d.workspaceName} (${d.workspaceId})`);
  lines.push(`# Generated: ${d.generatedAt}`);
  lines.push('');
  lines.push('## Totals');
  lines.push('metric,value');
  Object.entries(d.totals).forEach(([k, v]) => lines.push(`${csvEscape(k)},${csvEscape(v)}`));
  lines.push('');
  lines.push('## Members');
  lines.push('email,name,role,joinedAt');
  d.members.forEach((m) => lines.push(
    [m.email, m.name || '', m.role, m.joinedAt || ''].map(csvEscape).join(','),
  ));
  lines.push('');
  lines.push('## Activity per member');
  lines.push('email,events');
  d.perMemberActivity.forEach((m) => lines.push(`${csvEscape(m.email)},${m.events}`));
  lines.push('');
  lines.push('## Top actions');
  lines.push('action,count');
  d.perActionBreakdown.forEach((a) => lines.push(`${csvEscape(a.action)},${a.count}`));
  lines.push('');
  lines.push('## Recent activity (full)');
  lines.push('timestamp,actor,action,resource,service,statusCode,severity');
  d.activity.forEach((a) => lines.push([
    fmtDate(a.timestamp), a.actorEmail || '', a.action, a.resource || '',
    a.service || '', a.statusCode ?? '', a.severity || '',
  ].map(csvEscape).join(',')));

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `admin-report-${d.workspaceId.slice(0, 8)}-${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
}
