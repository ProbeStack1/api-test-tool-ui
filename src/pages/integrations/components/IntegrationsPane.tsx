/**
 * IntegrationsPane — connect Slack/Teams/Discord/PagerDuty/etc. via the
 * unified provider catalog. Pulls live providers from the backend so the
 * picker stays in sync with whatever the Java service exposes.
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plug, Plus, X, Loader2, Send, Pause, Play, Trash2,
  AlertTriangle, Mail, MessageSquare, BellRing, Bug, Activity, FileWarning,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  listIntegrations, createIntegration, testIntegration,
  pauseIntegration, resumeIntegration, deleteIntegration, providers,
  type IntegrationView,
} from '@/services/iwh.service';
import { Field, EmptyShell, fmtRelative, inputCls } from './_shared';
import { useSavedWebhookUrls } from '@/hooks/useSavedWebhookUrls';
import { cn } from '@/utils/cn';

/** Map of provider → icon for visual differentiation. */
const PROVIDER_ICONS: Record<string, any> = {
  SLACK: MessageSquare, TEAMS: MessageSquare, DISCORD: MessageSquare,
  GOOGLE_CHAT: MessageSquare,
  PAGERDUTY: BellRing, OPSGENIE: BellRing,
  EMAIL: Mail, MAILGUN: Mail, SENDGRID: Mail, POSTMARK: Mail, RESEND: Mail,
  GITHUB: Bug, GITLAB: Bug, BITBUCKET: Bug, JIRA: FileWarning,
  DATADOG: Activity, NEW_RELIC: Activity, GRAFANA: Activity, STATUSPAGE: Activity,
};

export const IntegrationsPane = ({ workspaceId }: { workspaceId: string }) => {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<IntegrationView | null>(null);

  const provQ = useQuery({ queryKey: ['iwh', 'providers'], queryFn: providers, staleTime: 60_000 });
  const q = useQuery({
    queryKey: ['iwh', 'integrations', workspaceId],
    queryFn: () => listIntegrations(workspaceId),
    refetchInterval: 12_000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['iwh'] });
  const testMut   = useMutation({ mutationFn: (id: string) => testIntegration(id),   onSuccess: () => { invalidate(); toast.success('Test sent'); }, onError: (e: any) => toast.error(e?.message ?? 'Test failed') });
  const pauseMut  = useMutation({ mutationFn: (id: string) => pauseIntegration(id),  onSuccess: () => { invalidate(); toast.success('Paused'); } });
  const resumeMut = useMutation({ mutationFn: (id: string) => resumeIntegration(id), onSuccess: () => { invalidate(); toast.success('Resumed'); } });
  const delMut    = useMutation({ mutationFn: (id: string) => deleteIntegration(id), onSuccess: () => { invalidate(); toast.success('Disconnected'); setConfirmDelete(null); } });
  const items = q.data?.content ?? [];

  return (
    <div className="flex h-full flex-col" data-testid="iwh-integrations">
      <header className="flex flex-wrap items-center gap-2 border-b border-border bg-surface/30 px-6 py-3">
        <h1 className="text-base font-semibold">Connected integrations</h1>
        <span className="text-[11px] text-text-muted">· Slack, Teams, Discord, PagerDuty &amp; more</span>
        <span className="ml-auto text-[10px] text-text-muted">{items.length} connections</span>
        <Button size="sm" variant="primary" onClick={() => setShowForm((v) => !v)} data-testid="iwh-int-toggle-form">
          {showForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          {showForm ? 'Cancel' : 'Connect new'}
        </Button>
      </header>

      {showForm && (
        <ConnectIntegrationForm
          workspaceId={workspaceId}
          providers={provQ.data ?? []}
          onCreated={() => { setShowForm(false); invalidate(); }}
        />
      )}

      <div className="flex-1 overflow-auto p-4">
        {q.isLoading ? (
          <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
        ) : items.length === 0 ? (
          <EmptyShell
            testId="iwh-integrations-empty"
            icon="integration"
            title="No integrations connected"
            body="Hook ForgeQ events into Slack, Teams, Discord, PagerDuty and more — without writing webhook glue."
            steps={[
              'Click "Connect new" and pick a provider',
              'Paste the provider\'s webhook / integration URL',
              'Events fan out automatically with retries built in',
            ]}
            ctaLabel="+ Connect your first"
            onCta={() => document.querySelector<HTMLButtonElement>('[data-testid="iwh-int-toggle-form"]')?.click()}
          />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" data-testid="iwh-integrations-list">
            {items.map((i) => (
              <IntegrationCard
                key={i.integrationId}
                i={i}
                onTest={() => testMut.mutate(i.integrationId)}
                onPause={() => pauseMut.mutate(i.integrationId)}
                onResume={() => resumeMut.mutate(i.integrationId)}
                onDelete={() => setConfirmDelete(i)}
              />
            ))}
          </ul>
        )}
      </div>

      {confirmDelete && (
        <ConfirmDialog
          open
          onOpenChange={(v) => !v && setConfirmDelete(null)}
          title="Disconnect integration?"
          description={`"${confirmDelete.name}" will stop receiving events. You can reconnect it later.`}
          confirmText={delMut.isPending ? 'Disconnecting…' : 'Disconnect'}
          tone="danger"
          onConfirm={() => delMut.mutate(confirmDelete.integrationId)}
          testId="iwh-int-confirm-delete"
        />
      )}
    </div>
  );
};

const IntegrationCard = ({ i, onTest, onPause, onResume, onDelete }: {
  i: IntegrationView; onTest: () => void; onPause: () => void; onResume: () => void; onDelete: () => void;
}) => {
  const Icon = PROVIDER_ICONS[i.provider] ?? Plug;
  const hasError = i.status === 'ERROR' || (i as any).health === 'UNHEALTHY' || !!i.lastError;
  const tone = hasError ? 'danger' : i.status === 'ACTIVE' ? 'success' : 'muted';
  return (
    <li data-testid={`iwh-int-card-${i.integrationId}`}
      className={cn('rounded-2xl border bg-surface/40 p-4 transition-colors',
        tone === 'success' ? 'border-border hover:border-primary/30' :
        tone === 'danger' ? 'border-danger/30' : 'border-border/40 opacity-70')}>
      <div className="flex items-start gap-3">
        <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-lg ring-1',
          tone === 'success' ? 'bg-primary/10 text-primary ring-primary/20' :
          tone === 'danger' ? 'bg-danger/10 text-danger ring-danger/20' :
          'bg-elevated text-text-muted ring-border')}>
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold tracking-tight" data-testid={`iwh-int-card-name-${i.integrationId}`}>{i.name}</h3>
          <p className="font-mono text-[10px] uppercase tracking-wider text-text-muted">{i.provider}</p>
          {i.lastError && (
            <p className="mt-1 line-clamp-2 text-[11px] text-danger" title={i.lastError}>
              <AlertTriangle className="mr-0.5 inline h-3 w-3 align-text-bottom" /> {i.lastError}
            </p>
          )}
          <p className="mt-1 text-[10px] text-text-muted">Last tested: {fmtRelative(i.lastTestedAt)}</p>
        </div>
        <span className={cn('rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider',
          tone === 'success' ? 'border-success/30 bg-success/10 text-success' :
          tone === 'danger' ? 'border-danger/30 bg-danger/10 text-danger' :
          'border-border bg-elevated text-text-muted')}>
          {i.status}
        </span>
      </div>
      <div className="mt-3 flex items-center justify-end gap-1">
        <Button size="sm" variant="ghost" onClick={onTest} title="Test" data-testid={`iwh-int-test-${i.integrationId}`}><Send className="h-3.5 w-3.5" /></Button>
        <Button size="sm" variant="ghost" onClick={i.status === 'ACTIVE' ? onPause : onResume}
          title={i.status === 'ACTIVE' ? 'Pause' : 'Resume'} data-testid={`iwh-int-toggle-${i.integrationId}`}>
          {i.status === 'ACTIVE' ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
        </Button>
        <Button size="sm" variant="ghost" onClick={onDelete} title="Disconnect" data-testid={`iwh-int-delete-${i.integrationId}`}>
          <Trash2 className="h-3.5 w-3.5 text-danger" />
        </Button>
      </div>
    </li>
  );
};

/** Per-provider config hint shown beneath the URL field. */
const PROVIDER_HINT: Record<string, string> = {
  SLACK: 'Slack incoming webhook URL — Apps → Incoming Webhooks → Add to Workspace.',
  TEAMS: 'Microsoft Teams incoming webhook URL — Channel → Connectors → Incoming Webhook.',
  DISCORD: 'Discord channel webhook URL — Server Settings → Integrations → Webhooks.',
  GOOGLE_CHAT: 'Google Chat incoming webhook URL — Manage webhooks for the space.',
  PAGERDUTY: 'PagerDuty Events API V2 integration URL.',
  OPSGENIE: 'Opsgenie webhook integration URL.',
  GITHUB: 'GitHub webhook delivery URL (paste your endpoint here).',
  GITLAB: 'GitLab integration URL.',
  JIRA: 'Jira automation webhook URL.',
  DATADOG: 'Datadog webhook URL.',
};

const ConnectIntegrationForm = ({ workspaceId, providers: provs, onCreated }: {
  workspaceId: string; providers: string[]; onCreated: () => void;
}) => {
  const list = provs.length ? provs : ['SLACK', 'TEAMS', 'DISCORD', 'PAGERDUTY'];
  const [provider, setProvider] = useState(list[0]);
  const [name, setName] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const Icon = PROVIDER_ICONS[provider] ?? Plug;
  const saved = useSavedWebhookUrls();
  const providerSaved = saved.filtered(provider);
  const [showSaved, setShowSaved] = useState(false);
  const [saveForLater, setSaveForLater] = useState(false);
  const mut = useMutation({
    mutationFn: () => createIntegration({
      workspaceId, provider, name,
      config: { webhookUrl }, // most chat/alert providers just need a webhook URL
    }),
    onSuccess: () => {
      if (saveForLater && webhookUrl) saved.add({ label: name, url: webhookUrl, provider });
      toast.success(`${provider} connected`); onCreated();
    },
    onError: (e: any) => toast.error(e?.message ?? 'Connect failed'),
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); mut.mutate(); }}
      data-testid="iwh-int-form"
      className="space-y-3 border-b border-border bg-probestack-bg/30 px-6 py-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Provider" required>
          <div className="flex items-center gap-2 rounded-md border border-border bg-probestack-bg px-2">
            <Icon className="h-3.5 w-3.5 text-primary" />
            <select data-testid="iwh-int-form-provider" value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="h-9 flex-1 bg-transparent text-xs outline-none">
              {list.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </Field>
        <Field label="Display name" required>
          <input data-testid="iwh-int-form-name" required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Engineering on-call" />
        </Field>
        <Field label="Webhook URL" required>
          <div className="flex items-center gap-1.5">
            <input data-testid="iwh-int-form-url" required type="url" value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} className={inputCls} placeholder="https://hooks.slack.com/services/…" />
            {providerSaved.length > 0 && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowSaved((v) => !v)}
                  className="h-9 shrink-0 rounded-md border border-primary/40 bg-primary/[0.06] px-2 text-[10px] font-medium text-primary hover:bg-primary/[0.12]"
                  title={`Pick from ${providerSaved.length} saved ${provider} URL${providerSaved.length === 1 ? '' : 's'}`}
                  data-testid="iwh-int-form-saved-toggle"
                >
                  Saved ({providerSaved.length})
                </button>
                {showSaved && (
                  <div data-testid="iwh-int-form-saved-menu" className="absolute right-0 top-full z-20 mt-1 w-72 rounded-md border border-border bg-surface p-1 shadow-2xl">
                    <ul className="max-h-60 overflow-auto">
                      {providerSaved.map((s) => (
                        <li key={s.id}>
                          <button
                            type="button"
                            onClick={() => { setWebhookUrl(s.url); if (!name) setName(s.label); setShowSaved(false); }}
                            className="flex w-full min-w-0 flex-col items-start px-2 py-1.5 text-left hover:bg-hover"
                          >
                            <span className="truncate text-[11px] font-medium">{s.label}</span>
                            <span className="truncate font-mono text-[9px] text-text-muted">{s.url}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
          <label className="mt-1.5 flex items-center gap-1.5 text-[10px] text-text-muted">
            <input
              type="checkbox"
              checked={saveForLater}
              onChange={(e) => setSaveForLater(e.target.checked)}
              className="h-3 w-3 rounded border-border bg-probestack-bg accent-primary"
              data-testid="iwh-int-form-save-checkbox"
            />
            Save this URL as a {provider} preset for next time
          </label>
        </Field>
      </div>
      <p className="text-[10px] text-text-muted">{PROVIDER_HINT[provider] ?? 'Outbound HTTP endpoint that will receive event payloads.'}</p>
      <div className="flex justify-end">
        <Button size="sm" variant="primary" type="submit"
          disabled={mut.isPending || !name.trim() || !webhookUrl.trim()}
          data-testid="iwh-int-form-submit">
          {mut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plug className="h-3.5 w-3.5" />} Connect
        </Button>
      </div>
    </form>
  );
};
