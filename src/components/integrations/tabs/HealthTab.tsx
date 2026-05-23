/**
 * HealthTab — live MCP server health monitor.
 *   • Auto-pings every 30s (uses existing /servers/{id}/probe endpoint via service)
 *   • Shows current state (UP / DOWN / DEGRADED) + last-seen timestamp
 *   • Shows rolling uptime % over the user-selected range (derived from history success rate)
 *   • Toast on transition (UP → DOWN, DOWN → UP)
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { HeartPulse, RefreshCw, Server as ServerIcon, Globe2, Wifi, WifiOff, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { listServers, probeServer, historyStats } from '@/services/mcp.service';
import { fmtRelative } from '@/lib/timezone';
import { useGlobalTimezone } from '@/hooks/useGlobalTimezone';
import { cn } from '@/utils/cn';

type Status = 'UP' | 'DOWN' | 'DEGRADED' | 'UNKNOWN';

export const HealthTab = () => {
  const qc = useQueryClient();
  const [zone] = useGlobalTimezone();
  const [autoPing, setAutoPing] = useState(true);

  const serversQ = useQuery({
    queryKey: ['mcp-health-servers'],
    queryFn: () => listServers(),
    refetchInterval: 30_000,
  });
  const servers = serversQ.data ?? [];

  // Auto-ping every 30s when enabled.
  const lastStatuses = useRef<Record<string, Status>>({});
  useEffect(() => {
    if (!autoPing || servers.length === 0) return;
    const tick = async () => {
      await Promise.all(servers.map(async (s: any) => {
        try {
          const res = await probeServer(s.id);
          const newStatus: Status = res?.status === 'UP' ? 'UP' : res?.status === 'DOWN' ? 'DOWN' : 'UNKNOWN';
          const prev = lastStatuses.current[s.id];
          if (prev && prev !== newStatus) {
            if (newStatus === 'DOWN')
              toast.error(`${s.name || s.serverUrl} is DOWN`, { id: `health-${s.id}` });
            else if (newStatus === 'UP')
              toast.success(`${s.name || s.serverUrl} is back UP`, { id: `health-${s.id}` });
          }
          lastStatuses.current[s.id] = newStatus;
        } catch { /* swallow */ }
      }));
      qc.invalidateQueries({ queryKey: ['mcp-health-servers'] });
    };
    const handle = setInterval(tick, 30_000);
    return () => clearInterval(handle);
  }, [autoPing, servers, qc]);

  const summary = useMemo(() => {
    const up = servers.filter((s: any) => s.status === 'UP').length;
    const down = servers.filter((s: any) => s.status === 'DOWN').length;
    const unknown = servers.length - up - down;
    return { up, down, unknown, total: servers.length };
  }, [servers]);

  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="mcp-health-tab">
      <header className="flex shrink-0 items-center gap-3 border-b border-border bg-surface/40 px-4 py-2.5">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          <HeartPulse className="h-4 w-4 text-primary" /> Server Health
          <span className="ml-2 text-xs font-normal text-text-muted">timezone: {zone}</span>
        </h3>
        <div className="ml-auto flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs">
            <input
              type="checkbox"
              checked={autoPing}
              data-testid="health-autoping-toggle"
              onChange={(e) => setAutoPing(e.target.checked)}
              className="h-3 w-3"
            />
            Auto-ping every 30s
          </label>
          <Button variant="outline" size="sm" data-testid="health-refresh"
                  onClick={() => qc.invalidateQueries({ queryKey: ['mcp-health-servers'] })}>
            <RefreshCw className={cn('h-3.5 w-3.5', serversQ.isFetching && 'animate-spin')} /> Refresh
          </Button>
        </div>
      </header>

      <div className="grid shrink-0 grid-cols-4 gap-3 border-b border-border bg-elevated/15 px-4 py-3">
        <Tile label="Total servers" value={summary.total}      icon={ServerIcon} />
        <Tile label="Up"            value={summary.up}         icon={Wifi}       tone="success" />
        <Tile label="Down"          value={summary.down}       icon={WifiOff}    tone={summary.down > 0 ? 'danger' : 'default'} />
        <Tile label="Unknown"       value={summary.unknown}    icon={ShieldAlert} tone={summary.unknown > 0 ? 'warning' : 'default'} />
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-4">
        {serversQ.isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : servers.length === 0 ? (
          <div className="rounded-md border border-dashed border-border bg-surface/30 p-12 text-center text-xs text-text-muted">
            No MCP servers configured.
          </div>
        ) : (
          <div className="space-y-2">
            {servers.map((s: any) => <HealthRow key={s.id} server={s} />)}
          </div>
        )}
      </div>
    </div>
  );
};

const Tile = ({ label, value, icon: Icon, tone = 'default' }: { label: string; value: number; icon: any; tone?: 'default' | 'success' | 'warning' | 'danger' }) => {
  const tones = { default: 'text-text-primary', success: 'text-success', warning: 'text-warning', danger: 'text-danger' } as const;
  return (
    <div className="rounded-lg border border-border/60 bg-surface/40 p-2" data-testid={`health-tile-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="mb-0.5 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
        <Icon className="h-3 w-3" />{label}
      </div>
      <div className={cn('text-base font-bold', tones[tone])}>{value}</div>
    </div>
  );
};

const HealthRow = ({ server }: { server: any }) => {
  // Compute uptime % from history success rate (last 7 days).
  const upQ = useQuery({
    queryKey: ['mcp-server-uptime', server.id],
    queryFn:  () => historyStats({ serverId: server.id, fromDate: new Date(Date.now() - 7 * 86400_000).toISOString() }),
    refetchInterval: 60_000,
  });
  const uptime = upQ.data?.successRate ?? 100;
  const status: Status = server.status ?? 'UNKNOWN';
  const statusTone: Record<Status, { dot: string; text: string; bg: string }> = {
    UP:       { dot: 'bg-success', text: 'text-success', bg: 'bg-success/10 border-success/30' },
    DOWN:     { dot: 'bg-danger',  text: 'text-danger',  bg: 'bg-danger/10  border-danger/30' },
    DEGRADED: { dot: 'bg-warning', text: 'text-warning', bg: 'bg-warning/10 border-warning/30' },
    UNKNOWN:  { dot: 'bg-text-muted', text: 'text-text-muted', bg: 'bg-elevated border-border' },
  };
  const t = statusTone[status];

  return (
    <div data-testid={`health-row-${server.id}`} className={cn('flex items-center gap-3 rounded-lg border p-3', t.bg)}>
      <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', t.dot, status === 'UP' && 'animate-pulse')} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold">{server.name || server.serverUrl}</span>
          <span className={cn('rounded border px-1.5 py-0.5 text-xs font-bold uppercase', t.text)}>{status}</span>
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-text-muted">
          <Globe2 className="h-3 w-3" /><span className="truncate font-mono">{server.serverUrl}</span>
          <span>·</span><span>{server.transport}</span>
          {server.lastSeenAt && (
            <><span>·</span><span>last seen {fmtRelative(server.lastSeenAt)}</span></>
          )}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className="font-mono text-base font-bold text-text-primary">{uptime.toFixed(1)}%</div>
        <div className="text-[11px] uppercase tracking-wider text-text-muted">7-day uptime</div>
      </div>
      {status === 'UP'
        ? <CheckCircle2 className="h-4 w-4 text-success" />
        : <ShieldAlert className="h-4 w-4 text-warning" />}
    </div>
  );
};
