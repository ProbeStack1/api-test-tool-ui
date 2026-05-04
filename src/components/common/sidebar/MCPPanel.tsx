/**
 * MCPPanel — the only navigation surface for the MCP Studio. Drives the
 * Zustand store; URL stays at `/projects/mcp`.
 */
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Activity, Server, Search, FolderOpen, Repeat, Sparkles, History as HistoryIcon,
  Boxes, ChevronRight, Plug, RotateCw,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { SidebarShell } from './SidebarShell';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tooltip } from '@/components/ui/Tooltip';
import { listServers, status, breakerState } from '@/services/mcp.service';
import { useMcpStudioStore, type StudioTab } from '@/stores/mcp-studio.store';
import { cn } from '@/utils/cn';

interface NavRow { key: StudioTab; icon: LucideIcon; label: string; sub: string }

const NAV: NavRow[] = [
  { key: 'servers',     icon: Server,      label: 'Servers',         sub: 'Discover · connect · share' },
  { key: 'inspector',   icon: Search,      label: 'Inspector',       sub: 'Tools · Resources · Prompts' },
  { key: 'collections', icon: FolderOpen,  label: 'Collections',     sub: 'Batch tool-call suites' },
  { key: 'mocks',       icon: Boxes,       label: 'Mock Servers',    sub: 'Fake MCPs for dev' },
  { key: 'rest',        icon: Repeat,      label: 'MCP ↔ REST',      sub: 'Call MCP from plain HTTP' },
  { key: 'aigen',       icon: Sparkles,    label: 'AI Test Gen',     sub: 'Gemini-drafted suites' },
  { key: 'history',     icon: HistoryIcon, label: 'History',         sub: 'Every call · 30-day log' },
];

export const MCPPanel = () => {
  const nav = useNavigate();
  const loc = useLocation();
  const tab = useMcpStudioStore((s) => s.activeTab);
  const setTab = useMcpStudioStore((s) => s.setTab);
  const activeServerId = useMcpStudioStore((s) => s.activeServerId);
  const setActiveServer = useMcpStudioStore((s) => s.setActiveServer);

  const { data: servers = [], isLoading } = useQuery({
    queryKey: ['mcp-servers'],
    queryFn: () => listServers(),
  });
  const { data: stat } = useQuery({ queryKey: ['mcp-status'], queryFn: status, refetchInterval: 30_000 });
  const { data: br }   = useQuery({ queryKey: ['mcp-breaker'], queryFn: breakerState, refetchInterval: 30_000 });

  const goTab = (k: StudioTab) => {
    setTab(k);
    if (!loc.pathname.startsWith('/projects/mcp')) nav('/projects/mcp');
  };

  const activeServer = servers.find((s) => s.id === activeServerId);

  return (
    <SidebarShell icon={Activity} title="MCP Studio" testId="mcp-panel">
      <div className="flex h-full flex-col">
        {/* Brand block */}
        <div className="space-y-1 p-3">
          <div className="rounded-lg border border-primary/40 bg-primary-muted/40 p-3">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-text-primary">MCP Studio</span>
              <span className="rounded bg-primary/30 px-1.5 py-0.5 text-[9px] font-bold text-primary">BETA</span>
            </div>
            <p className="mt-1 text-[11px] text-text-secondary">Inspect · orchestrate · mock · bridge</p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <Badge color={stat && stat.up > 0 ? 'success' : 'muted'}
                     label={`${stat?.up ?? 0}/${stat?.totalServers ?? 0} up`} />
              <Badge color={br?.state === 'OPEN' ? 'danger' : br?.state === 'HALF_OPEN' ? 'warning' : 'success'}
                     label={`Breaker ${br?.state ?? 'CLOSED'}`} />
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-1" data-testid="mcp-nav">
          {NAV.map(({ key, icon: Icon, label, sub }) => {
            const active = tab === key;
            return (
              <button
                key={key}
                data-testid={`mcp-nav-${key}`}
                onClick={() => goTab(key)}
                className={cn(
                  'flex w-full items-center justify-between gap-2 rounded-md px-2 py-2 text-left transition-colors',
                  active ? 'bg-primary-muted text-primary' : 'text-text-secondary hover:bg-hover hover:text-text-primary',
                )}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-primary' : 'text-text-muted')} />
                  <div className="min-w-0">
                    <div className="truncate text-xs">{label}</div>
                    <div className="truncate text-[10px] text-text-muted">{sub}</div>
                  </div>
                </div>
                {active && <ChevronRight className="h-3 w-3 shrink-0 text-primary" />}
              </button>
            );
          })}
        </nav>

        {/* Pinned Active-Server panel — bottom-left */}
        <div className="border-t border-border bg-surface/40 p-3" data-testid="mcp-active-server-pin">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">Active server</span>
            {activeServer && (
              <Tooltip content="Switch / clear">
                <button
                  data-testid="mcp-active-server-clear"
                  onClick={() => { setActiveServer(null); setTab('servers'); }}
                  className="text-[10px] text-primary hover:underline"
                ><RotateCw className="inline h-2.5 w-2.5" /> Switch</button>
              </Tooltip>
            )}
          </div>
          {isLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : activeServer ? (
            <button
              data-testid="mcp-active-server-card"
              onClick={() => goTab('inspector')}
              className="flex w-full items-start gap-2 rounded-md border border-border bg-elevated/40 p-2 text-left transition-colors hover:border-primary/40 hover:bg-hover/50"
            >
              <span className={cn('mt-1 h-1.5 w-1.5 shrink-0 rounded-full',
                activeServer.status === 'UP' ? 'bg-success'
                : activeServer.status === 'DOWN' ? 'bg-danger'
                : 'bg-text-muted')} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-medium">{activeServer.name}</div>
                <div className="truncate font-mono text-[10px] text-text-muted">{activeServer.serverUrl}</div>
                <div className="mt-1 flex items-center gap-1">
                  <span className="rounded bg-elevated px-1 font-mono text-[9px] text-text-secondary">
                    {activeServer.transport}
                  </span>
                  {activeServer.source === 'CATALOG' && (
                    <span className="rounded bg-primary-muted px-1 font-mono text-[9px] text-primary">CATALOG</span>
                  )}
                </div>
              </div>
              <Plug className="mt-1 h-3 w-3 shrink-0 text-primary" />
            </button>
          ) : (
            <div className="rounded-md border border-dashed border-border bg-surface/30 px-2 py-3 text-center text-[10px] text-text-muted" data-testid="mcp-active-server-empty">
              No server selected. Pick one from <strong>Servers</strong>.
            </div>
          )}
        </div>
      </div>
    </SidebarShell>
  );
};

const Badge = ({ color, label }: { color: 'success' | 'danger' | 'warning' | 'muted'; label: string }) => (
  <span className={cn(
    'inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px]',
    color === 'success' && 'border-success/40 bg-success-muted text-success',
    color === 'danger'  && 'border-danger/40 bg-danger-muted text-danger',
    color === 'warning' && 'border-warning/40 bg-warning-muted text-warning',
    color === 'muted'   && 'border-border bg-elevated text-text-muted',
  )}>
    <span className="h-1.5 w-1.5 rounded-full bg-current" />
    {label}
  </span>
);
