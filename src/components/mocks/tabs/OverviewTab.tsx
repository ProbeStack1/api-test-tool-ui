/**
 * OverviewTab — landing tab on a mock detail page. Shows the base URL,
 * the stats strip, and quick navigation cards into the other tabs.
 */
import { useState } from 'react';
import { Copy, ExternalLink, Power, Activity, ListTree, History } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Tooltip } from '@/components/ui/Tooltip';
import { MockStatsBadge } from '../parts/MockStatsBadge';
import { MethodBadge } from '../parts/MethodBadge';
import type { MockServer, MockEndpoint } from '@/services/mock.service';

export const OverviewTab = ({
  mock, endpoints, onJump,
}: { mock: MockServer; endpoints: MockEndpoint[]; onJump: (k: string) => void }) => {
  const [copied, setCopied] = useState(false);
  // Backend stores `baseUrl` as the relative API path (e.g. "/api/v1/mocks/my-mock").
  // Some setups (or migrations) end up persisting the full absolute URL — handle both.
  const fullUrl = /^https?:\/\//i.test(mock.baseUrl) ? mock.baseUrl : `${window.location.origin}${mock.baseUrl}`;

  return (
    <div className="space-y-5 p-5" data-testid="mock-overview-tab">
      {/* Hero — base URL card */}
      <section className="rounded-lg border border-border bg-elevated/40 p-4" data-testid="mock-baseurl-card">
        <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
          <Activity className="h-3 w-3" /> Mock base URL
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Tooltip content={fullUrl} side="bottom">
            <code className="min-w-0 flex-1 truncate rounded bg-probestack-bg px-3 py-2 font-mono text-sm">
              {fullUrl}
            </code>
          </Tooltip>
          <div className="flex gap-2">
            <Button
              variant="outline"
              data-testid="mock-baseurl-copy"
              onClick={async () => { await navigator.clipboard.writeText(fullUrl); setCopied(true); toast.success('Base URL copied'); setTimeout(() => setCopied(false), 1500); }}
            >
              <Copy className="h-3.5 w-3.5" /> {copied ? 'Copied' : 'Copy'}
            </Button>
            <Button
              variant="outline"
              data-testid="mock-baseurl-open"
              onClick={() => window.open(fullUrl, '_blank')}
            >
              <ExternalLink className="h-3.5 w-3.5" /> Open
            </Button>
          </div>
        </div>
        {mock.description && <p className="mt-2 text-xs text-text-secondary">{mock.description}</p>}
      </section>

      {/* Stats strip */}
      <MockStatsBadge stats={mock.stats || {}} />

      {/* Recent endpoints quick-look */}
      <section className="rounded-md border border-border" data-testid="mock-recent-endpoints">
        <header className="flex items-center justify-between border-b border-border bg-surface px-3 py-2">
          <h3 className="flex items-center gap-1.5 text-xs font-semibold">
            <ListTree className="h-3.5 w-3.5 text-primary" /> Endpoints
            <span className="rounded bg-elevated px-1.5 py-0.5 font-mono text-[9px] text-text-muted">{endpoints.length}</span>
          </h3>
          <button
            onClick={() => onJump('endpoints')}
            data-testid="mock-overview-goto-endpoints"
            className="text-[11px] text-primary hover:underline"
          >
            Manage all →
          </button>
        </header>
        {endpoints.length === 0 ? (
          <div className="p-6 text-center text-xs text-text-muted">
            No endpoints yet. Add your first to start serving responses.
          </div>
        ) : (
          <ul className="divide-y divide-border/40">
            {endpoints.slice(0, 6).map((e) => (
              <li key={e.id} data-testid={`mock-overview-ep-${e.id}`} className="flex items-center gap-2 px-3 py-1.5 text-xs">
                <MethodBadge method={e.method} size="xs" />
                <Tooltip content={e.pathPattern} side="bottom">
                  <span className="min-w-0 flex-1 truncate font-mono text-text-secondary">{e.pathPattern}</span>
                </Tooltip>
                {!e.enabled && (
                  <Tooltip content="Disabled">
                    <span className="flex h-4 items-center gap-0.5 rounded bg-warning-muted px-1 text-[9px] font-semibold text-warning">
                      <Power className="h-2.5 w-2.5" /> off
                    </span>
                  </Tooltip>
                )}
                <span className="rounded bg-elevated px-1 font-mono text-[9px] text-text-muted">{(e.responses?.[0]?.statusCode) ?? 200}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Quick links */}
      <section className="grid grid-cols-1 gap-2 sm:grid-cols-3" data-testid="mock-quick-links">
        <button
          onClick={() => onJump('hits')}
          data-testid="mock-quick-hits"
          className="flex items-center gap-2 rounded-md border border-border bg-surface/60 p-3 text-left transition-colors hover:border-primary/40 hover:bg-hover"
        >
          <History className="h-4 w-4 text-primary" />
          <div className="min-w-0">
            <div className="text-xs font-semibold">Hit log</div>
            <div className="text-[11px] text-text-muted">Last 100 requests</div>
          </div>
        </button>
        <button
          onClick={() => onJump('settings')}
          data-testid="mock-quick-settings"
          className="flex items-center gap-2 rounded-md border border-border bg-surface/60 p-3 text-left transition-colors hover:border-primary/40 hover:bg-hover"
        >
          <Power className="h-4 w-4 text-primary" />
          <div className="min-w-0">
            <div className="text-xs font-semibold">Server settings</div>
            <div className="text-[11px] text-text-muted">Latency · proxy · CORS · rate-limit</div>
          </div>
        </button>
        <button
          onClick={() => onJump('diff')}
          data-testid="mock-quick-diff"
          className="flex items-center gap-2 rounded-md border border-border bg-surface/60 p-3 text-left transition-colors hover:border-primary/40 hover:bg-hover"
        >
          <Activity className="h-4 w-4 text-primary" />
          <div className="min-w-0">
            <div className="text-xs font-semibold">Contract diff</div>
            <div className="text-[11px] text-text-muted">Compare responses vs upstream</div>
          </div>
        </button>
      </section>
    </div>
  );
};
