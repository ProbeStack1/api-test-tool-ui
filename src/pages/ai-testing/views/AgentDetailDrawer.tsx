/**
 * AgentDetailDrawer — full-height side drawer that opens when the user
 * clicks any agent card on the marketplace tab.
 *
 *   • Auto-fetches the richest possible payload on open: tries
 *     `/api/marketplace/agents/{id}` first, then falls back to
 *     `/api/proxy/agent-info/{id}` (which always returns deployment +
 *     deployedApis on Cloud Run).
 *   • Renders EVERY known field: description, bio, model, framework,
 *     average latency, version, last-updated, owner, organisation,
 *     capabilities, tools, deployment info (URL + region + service +
 *     status), endpoint table (method + path + full URL + auth flag),
 *     example request body / response shape, token quota, request-access
 *     form.
 *   • Each endpoint row has BOTH "Copy URL" and "Copy as cURL".
 *
 * Two primary CTAs at the top:
 *   "Try in Sandbox" → opens AgentTestingView with prefilled config
 *   "Import as Collection" → downloads Postman collection + saves to workspace
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Bot, Copy, ExternalLink, Loader2, Mail, Sparkles, ShieldAlert, X,
  Tag as TagIcon, Wrench, Cpu, Zap, Boxes, Globe, ServerCog, Hash, Clock,
  User, Building2, ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/utils/cn';
import {
  krenexusApi, kreBaseUrl,
  type KreAgent, type KreDeployedApi,
} from '../../../api/kernexux.api';
import { deployedApiToCurl } from '@/utils/agentToCollection';

interface Props {
  agent: KreAgent | null;
  onClose: () => void;
  onTrySandbox: (a: KreAgent) => void;
  onImportCollection: (a: KreAgent) => void;
}

const METHOD_TONE: Record<string, string> = {
  GET:    'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30',
  POST:   'bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30',
  PUT:    'bg-blue-500/15 text-blue-600 dark:text-blue-300 border-blue-500/30',
  PATCH:  'bg-purple-500/15 text-purple-600 dark:text-purple-300 border-purple-500/30',
  DELETE: 'bg-red-500/15 text-red-600 dark:text-red-300 border-red-500/30',
};

export const AgentDetailDrawer = ({ agent, onClose, onTrySandbox, onImportCollection }: Props) => {
  const [requesting, setRequesting] = useState(false);
  const [accessEmail, setAccessEmail] = useState('');
  const [accessReason, setAccessReason] = useState('');
  const [accessOpen, setAccessOpen] = useState(false);

  // Detail fetch state. We start with the shallow card payload and
  // progressively replace it with whatever the richest endpoint returns
  // so the drawer is never empty while data loads in the background.
  const [detail, setDetail] = useState<KreAgent | null>(agent);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    setDetail(agent);
    if (!agent?.id) return;
    let cancelled = false;
    const load = async () => {
      setLoadingDetail(true);
      try {
        // Step 1 — marketplace detail (sanitised, always works).
        const enriched = await krenexusApi.getAgent(agent.id).catch(() => null);
        if (!cancelled && enriched) {
          setDetail((prev) => mergeAgent(prev, enriched));
        }
        // Step 2 — agent-info on the Cloud Run side (richest, has
        // deployedApis with absolute URLs).
        const info = await krenexusApi.getAgentInfo(agent.id).catch(() => null);
        if (!cancelled && info) {
          setDetail((prev) => mergeAgent(prev, info));
        }
      } finally {
        if (!cancelled) setLoadingDetail(false);
      }
    };
    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agent?.id]);

  /* Token-limit progress — only computed when upstream sends both
   *  the limit AND a usage figure. Without usage, we just show the
   *  cap as a static info chip. */
  const quota = useMemo(() => {
    if (!detail?.publicTokenLimit) return null;
    const used = (detail.publicCallsRemaining !== undefined && detail.publicCallLimit)
      ? detail.publicCallLimit - detail.publicCallsRemaining
      : null;
    const ratio = (used !== null && detail.publicCallLimit)
      ? Math.min(1, Math.max(0, used / detail.publicCallLimit))
      : null;
    return { limit: detail.publicTokenLimit, used, ratio };
  }, [detail]);

  if (!detail) return null;

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
    } catch {
      toast.error('Copy failed — check clipboard permissions');
    }
  };

  const copyCurl = (api: KreDeployedApi) => copy(deployedApiToCurl(api), `cURL · ${api.method} ${api.path}`);
  const copyUrl  = (api: KreDeployedApi) => copy(api.url || `${kreBaseUrl()}${api.path}`, `URL · ${api.path}`);

  const submitAccess = async () => {
    if (!accessEmail.trim()) { toast.error('Email is required'); return; }
    setRequesting(true);
    try {
      await krenexusApi.requestAccess(detail.id, {
        email: accessEmail.trim(),
        reason: accessReason.trim() || undefined,
      });
      toast.success('Access request sent', { description: 'The agent owner will email you shortly.' });
      setAccessOpen(false); setAccessEmail(''); setAccessReason('');
    } catch (e: any) {
      toast.error('Could not submit request', { description: e?.message });
    } finally { setRequesting(false); }
  };

  // Friendly display values.
  const deploymentUrl = detail.deploymentInfo?.url || '';
  const region        = detail.deploymentInfo?.region || '';
  const serviceName   = detail.deploymentInfo?.serviceName || '';
  const dStatus       = detail.deploymentInfo?.status || detail.status || '';
  const lastUpdated   = detail.lastUpdatedAt ? new Date(detail.lastUpdatedAt).toLocaleString() : '';

  return (
    <div
      data-testid="agent-detail-drawer"
      className="fixed inset-0 z-50 flex"
      role="dialog"
      aria-modal="true"
    >
      {/* backdrop */}
      <button
        type="button"
        aria-label="Close"
        className="flex-1 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        data-testid="agent-detail-backdrop"
      />

      <div className="flex h-full w-full max-w-3xl flex-col border-l border-border bg-surface shadow-2xl">
        {/* header */}
        <div className="flex items-start gap-3 border-b border-border px-5 py-4">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-elevated">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-base font-semibold">{detail.name}</h2>
              {dStatus && (
                <span className={cn(
                  'rounded-full px-1.5 py-0.5 text-[12px] font-semibold uppercase',
                  dStatus === 'deployed' || dStatus === 'available' || dStatus === 'active'
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300'
                    : 'bg-amber-500/15 text-amber-600 dark:text-amber-300',
                )}>{dStatus}</span>
              )}
              {detail.version && (
                <span className="rounded bg-elevated px-1.5 py-0.5 font-mono text-[12px] text-text-muted">
                  v{detail.version}
                </span>
              )}
              {loadingDetail && <Loader2 className="h-3 w-3 animate-spin text-text-muted" />}
            </div>
            <div className="mt-0.5 truncate text-sm text-text-muted">
              {detail.ownerName ?? detail.organization ?? 'KRE Nexus'} · {detail.agentType ?? 'AI agent'}
              {detail.modelName ? ` · ${detail.modelName}` : ''}
            </div>
            <div className="mt-0.5 truncate font-mono text-sm text-text-muted">
              id: {detail.id}
            </div>
          </div>
          <button
            type="button"
            data-testid="agent-detail-close"
            onClick={onClose}
            className="rounded-md p-1 text-text-muted hover:bg-elevated"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* primary CTAs */}
        <div className="flex gap-2 border-b border-border px-5 py-3">
          <button
            type="button"
            data-testid="agent-detail-try-sandbox"
            onClick={() => onTrySandbox(detail)}
            className="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-primary/90"
          >
            <Sparkles className="h-3.5 w-3.5" /> Try in Sandbox
          </button>
          <button
            type="button"
            data-testid="agent-detail-import-collection"
            onClick={() => onImportCollection(detail)}
            className="inline-flex items-center justify-center gap-1.5 rounded-md border border-border bg-elevated px-3 py-1.5 text-[12px] font-semibold hover:bg-surface"
          >
            <Boxes className="h-3.5 w-3.5" /> Import as Collection
          </button>
        </div>

        {/* scrollable body */}
        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {/* description */}
          {detail.description && (
            <p className="text-[12px] leading-relaxed text-text-secondary whitespace-pre-line">
              {detail.description}
            </p>
          )}

          {/* meta chips */}
          <div className="flex flex-wrap gap-1.5 text-sm">
            {detail.framework        && <Chip icon={Cpu}      label={detail.framework} />}
            {detail.modelName        && <Chip icon={Hash}     label={detail.modelName} />}
            {detail.averageLatencyMs && <Chip icon={Zap}      label={`~${detail.averageLatencyMs} ms`} />}
            {lastUpdated             && <Chip icon={Clock}    label={`updated ${lastUpdated}`} />}
            {detail.ownerName        && <Chip icon={User}     label={detail.ownerName} />}
            {detail.organization     && <Chip icon={Building2} label={detail.organization} />}
            {detail.tags?.map((t) => <Chip key={t} icon={TagIcon} label={t} />)}
          </div>

          {/* deployment info — Cloud Run URL + region + service */}
          {(deploymentUrl || region || serviceName) && (
            <Section title="Deployment" icon={ServerCog}>
              <div className="space-y-2 rounded-lg border border-border bg-probestack-bg p-3 text-sm">
                {deploymentUrl && (
                  <KvRow label="Base URL">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <code className="truncate font-mono text-text-primary">{deploymentUrl}</code>
                      <button type="button" onClick={() => copy(deploymentUrl, 'Base URL')}
                              data-testid="agent-detail-copy-base-url"
                              className="grid h-5 w-5 shrink-0 place-items-center rounded border border-border bg-surface hover:bg-elevated">
                        <Copy className="h-2.5 w-2.5" />
                      </button>
                      <a href={deploymentUrl} target="_blank" rel="noreferrer"
                         className="grid h-5 w-5 shrink-0 place-items-center rounded border border-border bg-surface hover:bg-elevated">
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    </div>
                  </KvRow>
                )}
                {serviceName && (
                  <KvRow label="Service">
                    <code className="font-mono">{serviceName}</code>
                  </KvRow>
                )}
                {region && (
                  <KvRow label="Region">
                    <code className="font-mono">{region}</code>
                  </KvRow>
                )}
                {dStatus && (
                  <KvRow label="Status">
                    <span className={cn(
                      'inline-block rounded-full px-1.5 py-0.5 font-mono text-[12px] font-semibold uppercase',
                      dStatus === 'deployed' || dStatus === 'available' || dStatus === 'active'
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300'
                        : 'bg-amber-500/15 text-amber-600 dark:text-amber-300',
                    )}>{dStatus}</span>
                  </KvRow>
                )}
              </div>
            </Section>
          )}

          {/* token quota */}
          {quota && (
            <div className="rounded-lg border border-border bg-probestack-bg p-3">
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="font-semibold">Public sandbox quota</span>
                <span className="font-mono text-text-muted">
                  {quota.used !== null ? `${quota.used} / ` : ''}{quota.limit.toLocaleString()} tokens
                </span>
              </div>
              {quota.ratio !== null ? (
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      quota.ratio < 0.5  ? 'bg-emerald-500' :
                      quota.ratio < 0.85 ? 'bg-amber-500'  : 'bg-red-500',
                    )}
                    style={{ width: `${quota.ratio * 100}%` }}
                  />
                </div>
              ) : (
                <p className="text-sm text-text-muted">
                  Sandbox calls are token-metered. Request full access to remove the cap.
                </p>
              )}
              <button
                type="button"
                data-testid="agent-detail-request-access"
                onClick={() => setAccessOpen((v) => !v)}
                className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
              >
                <Mail className="h-3 w-3" /> Request full access
              </button>
              {accessOpen && (
                <div className="mt-2 space-y-2 rounded-md border border-border bg-surface p-2">
                  <input
                    data-testid="agent-detail-access-email"
                    value={accessEmail}
                    onChange={(e) => setAccessEmail(e.target.value)}
                    placeholder="your@company.com"
                    className="w-full rounded border border-border bg-transparent px-2 py-1 text-[12px]"
                  />
                  <textarea
                    data-testid="agent-detail-access-reason"
                    value={accessReason}
                    onChange={(e) => setAccessReason(e.target.value)}
                    placeholder="Why do you need full access? (optional)"
                    rows={2}
                    className="w-full rounded border border-border bg-transparent px-2 py-1 text-[12px]"
                  />
                  <button
                    type="button"
                    data-testid="agent-detail-access-submit"
                    onClick={submitAccess}
                    disabled={requesting || !accessEmail.trim()}
                    className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {requesting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Mail className="h-3 w-3" />}
                    Send request
                  </button>
                </div>
              )}
            </div>
          )}

          {/* capabilities */}
          {detail.capabilities && detail.capabilities.length > 0 && (
            <Section title={`Capabilities (${detail.capabilities.length})`}>
              <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                {detail.capabilities.map((c, i) => (
                  <li key={i} className="rounded border border-border bg-elevated/40 px-2 py-1 text-sm">
                    {c}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* tools */}
          {detail.tools && detail.tools.length > 0 && (
            <Section title={`Tools (${detail.tools.length})`} icon={Wrench}>
              <div className="flex flex-wrap gap-1.5">
                {detail.tools.map((t) => (
                  <span key={t} className="rounded-full border border-border bg-elevated px-2 py-0.5 font-mono text-sm">
                    {t}
                  </span>
                ))}
              </div>
            </Section>
          )}

          {/* deployedApis table — primary list with full URL + copy buttons */}
          {detail.deployedApis && detail.deployedApis.length > 0 && (
            <Section title={`Deployed endpoints (${detail.deployedApis.length})`} icon={Globe}>
              <div className="overflow-hidden rounded-md border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-elevated text-left text-sm uppercase text-text-muted">
                    <tr>
                      <th className="w-16 px-2 py-1.5">Method</th>
                      <th className="px-2 py-1.5">Endpoint</th>
                      <th className="w-28 px-2 py-1.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.deployedApis.map((api, i) => (
                      <EndpointRow key={i} index={i} api={api}
                                   onCopyUrl={() => copyUrl(api)}
                                   onCopyCurl={() => copyCurl(api)} />
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-1.5 text-sm text-text-muted">
                <ShieldAlert className="-mt-0.5 inline h-3 w-3" /> Public-sandbox endpoints.
                Click <strong>Import as Collection</strong> above to test them in the request
                builder with assertions, variables and scheduled runs.
              </p>
            </Section>
          )}

          {/* High-level endpoints (summary only — no absolute URL).
              We render this only when deployedApis is empty as a fallback. */}
          {(!detail.deployedApis || detail.deployedApis.length === 0)
              && detail.endpoints && detail.endpoints.length > 0 && (
            <Section title={`Endpoints (${detail.endpoints.length})`} icon={Globe}>
              <div className="overflow-hidden rounded-md border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-elevated text-left text-sm uppercase text-text-muted">
                    <tr>
                      <th className="w-16 px-2 py-1.5">Method</th>
                      <th className="px-2 py-1.5">Path</th>
                      <th className="px-2 py-1.5">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.endpoints.map((e, i) => (
                      <tr key={i} className="border-t border-border hover:bg-elevated/40">
                        <td className="px-2 py-1.5">
                          <span className={cn(
                            'rounded border px-1.5 py-0.5 font-mono text-[12px] font-semibold',
                            METHOD_TONE[e.method] ?? 'border-border bg-elevated text-text-secondary',
                          )}>{e.method}</span>
                        </td>
                        <td className="px-2 py-1.5 font-mono text-sm text-text-primary">{e.path}</td>
                        <td className="px-2 py-1.5 text-text-muted">{e.description ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          )}

          {loadingDetail && (
            <div className="flex items-center justify-center py-3 text-sm text-text-muted">
              <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> Loading deeper details from KRE Nexus…
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────── sub-components ───────────────────────────── */

/** A single endpoint row — collapsible to show example request/response. */
function EndpointRow({
  api, index, onCopyUrl, onCopyCurl,
}: { api: KreDeployedApi; index: number; onCopyUrl: () => void; onCopyCurl: () => void }) {
  const [open, setOpen] = useState(false);
  const hasExpand = !!(api.requestBody || api.responseFormat || api.url);
  return (
    <>
      <tr
        className="border-t border-border hover:bg-elevated/40"
        data-testid={`agent-endpoint-row-${index}`}
      >
        <td className="px-2 py-1.5">
          <span className={cn(
            'rounded border px-1.5 py-0.5 font-mono text-[12px] font-semibold',
            METHOD_TONE[api.method] ?? 'border-border bg-elevated text-text-secondary',
          )}>{api.method}</span>
        </td>
        <td className="px-2 py-1.5">
          <div className="flex items-center gap-1">
            {hasExpand && (
              <button type="button" onClick={() => setOpen((v) => !v)}
                      data-testid={`agent-endpoint-expand-${index}`}
                      className="grid h-4 w-4 shrink-0 place-items-center rounded text-text-muted hover:bg-elevated">
                <ChevronDown className={cn('h-3 w-3 transition-transform', open && 'rotate-180')} />
              </button>
            )}
            <div className="min-w-0">
              <div className="truncate font-mono text-sm text-text-primary">
                {api.label && <span className="font-semibold text-text-primary">{api.label} </span>}
                {api.path}
              </div>
              {api.url && (
                <div className="truncate font-mono text-sm text-text-muted">{api.url}</div>
              )}
              {!api.label && api.description && (
                <div className="text-sm text-text-muted">{api.description}</div>
              )}
            </div>
          </div>
        </td>
        <td className="px-2 py-1.5">
          <div className="flex justify-end gap-1">
            <button
              type="button"
              data-testid={`agent-endpoint-copy-url-${index}`}
              onClick={onCopyUrl}
              title="Copy URL"
              className="inline-flex items-center gap-1 rounded border border-border bg-surface px-1.5 py-0.5 text-sm hover:bg-elevated"
            >
              <Copy className="h-3 w-3" /> URL
            </button>
            <button
              type="button"
              data-testid={`agent-endpoint-copy-curl-${index}`}
              onClick={onCopyCurl}
              title="Copy as cURL"
              className="inline-flex items-center gap-1 rounded border border-border bg-surface px-1.5 py-0.5 text-sm hover:bg-elevated"
            >
              <Copy className="h-3 w-3" /> cURL
            </button>
          </div>
        </td>
      </tr>
      {open && (
        <tr className="border-t border-border bg-elevated/30">
          <td colSpan={3} className="px-3 py-2">
            {api.url && (
              <div className="mb-2">
                <div className="mb-0.5 text-[12px] font-semibold uppercase tracking-wide text-text-muted">Full URL</div>
                <code className="block break-all rounded bg-surface p-1.5 font-mono text-sm text-text-primary">{api.url}</code>
              </div>
            )}
            {api.requestBody !== undefined && api.requestBody !== null && (
              <div className="mb-2">
                <div className="mb-0.5 text-[12px] font-semibold uppercase tracking-wide text-text-muted">Request body</div>
                <pre className="overflow-auto rounded bg-surface p-2 font-mono text-sm text-text-primary max-h-40">
                  {typeof api.requestBody === 'string' ? api.requestBody : JSON.stringify(api.requestBody, null, 2)}
                </pre>
              </div>
            )}
            {api.responseFormat !== undefined && api.responseFormat !== null && (
              <div>
                <div className="mb-0.5 text-[12px] font-semibold uppercase tracking-wide text-text-muted">Response format</div>
                <pre className="overflow-auto rounded bg-surface p-2 font-mono text-sm text-text-primary max-h-40">
                  {typeof api.responseFormat === 'string' ? api.responseFormat : JSON.stringify(api.responseFormat, null, 2)}
                </pre>
              </div>
            )}
            <div className="mt-2 flex items-center gap-2 text-sm text-text-muted">
              {api.authRequired ? <ShieldAlert className="h-3 w-3 text-amber-500" /> : null}
              {api.authRequired ? 'Auth required (Bearer)' : 'No auth (sandbox)'}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

/* ─────────────────────── tiny internal helpers ─────────────────────────── */
function Section({ title, icon: Icon, children }: { title: string; icon?: typeof Bot; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wider text-text-muted">
        {Icon ? <Icon className="h-3 w-3" /> : null}
        {title}
      </div>
      {children}
    </div>
  );
}

function Chip({ icon: Icon, label }: { icon: typeof Bot; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-elevated px-1.5 py-0.5">
      <Icon className="h-2.5 w-2.5" />
      <span>{label}</span>
    </span>
  );
}

function KvRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[110px,1fr] items-center gap-2">
      <div className="text-sm uppercase tracking-wide text-text-muted">{label}</div>
      <div className="min-w-0 text-sm text-text-primary">{children}</div>
    </div>
  );
}

/** Shallow-merge two agent payloads, preferring populated fields from
 *  the newer payload while preserving anything the older one already had
 *  (so e.g. tags fetched from the list survive when the detail endpoint
 *  returns an agent without them). */
function mergeAgent(prev: KreAgent | null, next: KreAgent): KreAgent {
  if (!prev) return next;
  return {
    ...prev,
    ...Object.fromEntries(
      Object.entries(next).filter(([_, v]) =>
        v !== undefined && v !== null
        && !(Array.isArray(v) && v.length === 0),
      ),
    ),
  } as KreAgent;
}
