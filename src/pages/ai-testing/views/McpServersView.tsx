/**
 * McpServersView — read-only mirror of the MCP Studio's server registry.
 *
 * AI Testing does NOT own MCP servers; this view just lists what's
 * already configured under MCP Studio (so agents in this workspace can
 * pick one). The "Manage in MCP Studio" CTA jumps straight to the
 * source-of-truth panel.
 */
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, ExternalLink, Loader2, Server, RefreshCw } from 'lucide-react';
import { listMcpServers, type McpServerInfo } from '@/services/aiTesting.service';

export const McpServersView = ({ workspaceId }: { workspaceId: string }) => {
  const nav = useNavigate();
  const [servers, setServers] = useState<McpServerInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const s = await listMcpServers(workspaceId);
      setServers(Array.isArray(s) ? s : []);
    } finally { setLoading(false); }
  }, [workspaceId]);

  useEffect(() => { fetch(); }, [fetch]);

  return (
    <div className="p-6" data-testid="ai-testing-mcp-view">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-lg font-semibold">MCP servers</h2>
          <p className="text-xs text-text-muted">
            Registered in <strong className="text-text-primary">MCP Studio</strong>. AI Testing pulls them here
            for read-only selection. Manage / add new from MCP Studio.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetch}
            data-testid="ai-testing-mcp-refresh"
            className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-3 py-1.5 text-[12px] font-semibold hover:bg-elevated"
          >
            <RefreshCw className="h-3 w-3" /> Refresh
          </button>
          <button
            type="button"
            onClick={() => nav('/projects/mcp')}
            data-testid="ai-testing-mcp-open-studio"
            className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-primary/90"
          >
            Manage in MCP Studio <ArrowUpRight className="h-3 w-3" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="mt-10 grid place-items-center text-text-muted">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : servers.length === 0 ? (
        <div className="mt-10 rounded-lg border border-dashed border-border bg-surface p-10 text-center text-[12px] text-text-muted"
             data-testid="ai-testing-mcp-empty">
          <Server className="mx-auto mb-2 h-8 w-8 opacity-50" />
          No MCP servers registered. Add one in{' '}
          <button onClick={() => nav('/projects/mcp')} className="text-primary hover:underline">
            MCP Studio
          </button>{' '}
          first.
        </div>
      ) : (
        <ul className="mt-5 space-y-2" data-testid="ai-testing-mcp-list">
          {servers.map((s) => (
            <li key={s.id}
                data-testid={`ai-testing-mcp-row-${s.id}`}
                className="flex items-start gap-3 rounded-lg border border-border bg-surface p-3 transition-colors hover:border-primary/40">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary-muted text-primary">
                <Server className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-sm font-semibold">{s.name}</div>
                  {s.status && (
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                      s.status === 'UP' ? 'bg-success/10 text-success' :
                      s.status === 'DOWN' ? 'bg-danger/10 text-danger' :
                      'bg-elevated text-text-muted'
                    }`}>
                      {s.status}
                    </span>
                  )}
                  {s.transport && (
                    <span className="rounded bg-elevated px-1.5 py-0.5 font-mono text-[10px] text-text-secondary">
                      {s.transport}
                    </span>
                  )}
                  {s.source === 'CATALOG' && (
                    <span className="rounded bg-primary-muted px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                      CATALOG
                    </span>
                  )}
                </div>
                <div className="mt-0.5 truncate font-mono text-[11px] text-text-muted">
                  {s.serverUrl ?? s.url ?? '—'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => nav(`/projects/mcp?tab=inspector&server=${s.id}`)}
                title="Inspect in MCP Studio"
                className="grid h-7 w-7 place-items-center rounded-md border border-border text-text-secondary hover:bg-elevated"
              >
                <ExternalLink className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
