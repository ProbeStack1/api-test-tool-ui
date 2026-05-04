/**
 * GovernancePage — placeholder page with "Coming Soon" state.
 * Shows the governance rules roadmap so demos can present the vision.
 * Full implementation will pull from ForgeSphere once the schema is shared.
 */
import { Shield, CheckCircle2, AlertTriangle, Lock, Tag, Zap, Globe, FileText } from 'lucide-react';

const ROADMAP = [
  { icon: Lock, title: 'Auth enforcement', desc: 'Every endpoint must declare an auth scheme (Bearer / API key / OAuth).', badge: 'P0' },
  { icon: Tag, title: 'Naming conventions', desc: 'Endpoints follow kebab-case / snake_case rules; versioning prefix required.', badge: 'P0' },
  { icon: Zap, title: 'Rate limits declared', desc: 'Every public endpoint must specify a documented rate-limit.', badge: 'P1' },
  { icon: FileText, title: 'Response schema', desc: 'All 2xx responses must have a validated JSON Schema or OpenAPI ref.', badge: 'P1' },
  { icon: Globe, title: 'HTTPS only', desc: 'No plaintext HTTP in declared base URLs.', badge: 'P0' },
  { icon: Shield, title: 'PII policy', desc: 'Tag fields containing PII so GDPR / DPDP audits can scan automatically.', badge: 'P2' },
];

export function GovernancePage() {
  return (
    <div data-testid="governance-page" className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10">
          <Shield className="h-5 w-5 text-purple-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">API Governance</h1>
          <p className="text-sm text-text-muted">
            Define org-wide rules; every Collection is continuously scored against them.
          </p>
        </div>
        <span className="ml-auto rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold text-amber-500">
          Coming soon · v1 ships in the next milestone
        </span>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-6">
        <div className="mb-4 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
          <AlertTriangle className="h-3.5 w-3.5" />
          Planned rules
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {ROADMAP.map(({ icon: Icon, title, desc, badge }) => (
            <div
              key={title}
              data-testid={`gov-rule-${title.replace(/\s+/g, '-').toLowerCase()}`}
              className="flex gap-3 rounded-xl border border-border/60 bg-probestack-bg/40 p-4"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-500/10">
                <Icon className="h-4 w-4 text-purple-500" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold">{title}</h3>
                  <span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-[10px] font-bold text-purple-500">
                    {/* {badge} */}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-text-muted">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-6">
        <div className="mb-4 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
          <CheckCircle2 className="h-3.5 w-3.5" />
          What you will get
        </div>
        <ul className="grid gap-2 text-sm md:grid-cols-2">
          <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" /> Per-collection governance score (0–100).</li>
          <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" /> Pass / fail badge on every request.</li>
          <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" /> Pre-commit rule enforcement via CLI.</li>
          <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" /> Org-wide rule packs (OWASP, GDPR, HIPAA).</li>
        </ul>
      </div>
    </div>
  );
}

export default GovernancePage;
