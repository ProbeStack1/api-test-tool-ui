/**
 * ServersTab — premium server browser with two surfaces:
 *
 *   • Catalog (default) — curated open-source MCP servers users can
 *     discover and 1-click connect. Filter chips for category +
 *     search. Each card has a Connect button.
 *
 *   • My Servers — saved servers (USER + CATALOG-connected + MOCK).
 *     Filter chips for All · Mine · Catalog · Mocks plus search.
 *     Card actions: Use (set as Active), Probe, Edit, Copy URL,
 *     Claude Config, Delete.
 *
 * No URL params — everything driven by useMcpStudioStore. Cards style
 * matches the user-supplied screenshots (compact, status pill, Selected
 * badge for the active server).
 */
import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Server, RefreshCw, Loader2, Pencil, Trash2, Activity, Copy,
  Search, ExternalLink, ShieldCheck, Globe, Boxes, User, Download,
  Sparkles, BookOpen, CheckCircle2, AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tooltip } from '@/components/ui/Tooltip';
import { Modal } from '@/components/ui/Modal';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { useMcpStudioStore } from '@/stores/mcp-studio.store';
import {
  listServers, createServer, updateServer, deleteServer, probeServer,
  listCatalog, connectFromCatalog, claudeConfigUrl,
  type McpServer, type McpTransport, type McpCatalogEntry,
} from '@/services/mcp.service';
import { cn } from '@/utils/cn';

type Surface = 'catalog' | 'my';

export const ServersTab = () => {
  const ws = useWorkspaceStore((s) => s.current);
  const filter = useMcpStudioStore((s) => s.serversFilter);
  const setFilter = useMcpStudioStore((s) => s.setServersFilter);
  const search = useMcpStudioStore((s) => s.serversSearch);
  const setSearch = useMcpStudioStore((s) => s.setServersSearch);
  const setActiveServer = useMcpStudioStore((s) => s.setActiveServer);
  const activeServerId = useMcpStudioStore((s) => s.activeServerId);
  const setTab = useMcpStudioStore((s) => s.setTab);

  const catLicense    = useMcpStudioStore((s) => s.catalogLicense);
  const catPricing    = useMcpStudioStore((s) => s.catalogPricing);
  const catVisibility = useMcpStudioStore((s) => s.catalogVisibility);
  const catOfficial   = useMcpStudioStore((s) => s.catalogOfficial);
  const catCategory   = useMcpStudioStore((s) => s.catalogCategory);
  const setCatLicense    = useMcpStudioStore((s) => s.setCatalogLicense);
  const setCatPricing    = useMcpStudioStore((s) => s.setCatalogPricing);
  const setCatVisibility = useMcpStudioStore((s) => s.setCatalogVisibility);
  const setCatOfficial   = useMcpStudioStore((s) => s.setCatalogOfficial);
  const setCatCategory   = useMcpStudioStore((s) => s.setCatalogCategory);
  const resetCatFilters  = useMcpStudioStore((s) => s.resetCatalogFilters);

  const [surface, setSurface] = useState<Surface>('catalog');
  const [editing, setEditing] = useState<McpServer | null>(null);
  const [creating, setCreating] = useState(false);
  const [connecting, setConnecting] = useState<McpCatalogEntry | null>(null);
  const [busyProbe, setBusyProbe] = useState<string | null>(null);

  const qc = useQueryClient();

  const { data: servers = [], isLoading: loadingMy } = useQuery({
    queryKey: ['mcp-servers', ws?.id],
    queryFn: () => listServers(ws?.id),
  });
  const { data: catalog, isLoading: loadingCat } = useQuery({
    queryKey: ['mcp-catalog', search, catLicense, catPricing, catVisibility, catOfficial, catCategory],
    queryFn: () => listCatalog({
      q: search || undefined,
      license:    catLicense    === 'ANY' ? undefined : catLicense,
      pricing:    catPricing    === 'ANY' ? undefined : catPricing,
      visibility: catVisibility === 'ANY' ? undefined : catVisibility,
      official:   catOfficial   === 'ANY' ? undefined : catOfficial === 'OFFICIAL',
      category:   catCategory   === 'ALL' ? undefined : catCategory,
    }),
  });
  const activeFilterCount =
    (catLicense    !== 'ANY' ? 1 : 0) +
    (catPricing    !== 'ANY' ? 1 : 0) +
    (catVisibility !== 'ANY' ? 1 : 0) +
    (catOfficial   !== 'ANY' ? 1 : 0) +
    (catCategory   !== 'ALL' ? 1 : 0);

  const filteredMy = useMemo(() => {
    return servers.filter((s) => {
      if (filter === 'MINE'    && s.source !== 'USER') return false;
      if (filter === 'CATALOG' && s.source !== 'CATALOG') return false;
      if (filter === 'MOCKS'   && !s.isMock) return false;
      if (search) {
        const q = search.toLowerCase();
        return (s.name + ' ' + (s.serverUrl || '') + ' ' + (s.description || '')).toLowerCase().includes(q);
      }
      return true;
    });
  }, [servers, filter, search]);

  const probe = async (id: string) => {
    setBusyProbe(id);
    try {
      const r = await probeServer(id);
      toast[r.status === 'UP' ? 'success' : 'error'](
        `${r.status} · ${r.latencyMs}ms${r.error ? ' · ' + r.error : ''}`,
      );
      await qc.invalidateQueries({ queryKey: ['mcp-servers'] });
    } catch (e: any) { toast.error(e?.message ?? 'Probe failed'); }
    finally { setBusyProbe(null); }
  };

  const useAsActive = (s: McpServer) => {
    setActiveServer(s.id);
    setTab('inspector');
    toast.success(`Active: ${s.name}`);
  };

  const downloadClaudeConfig = (s: McpServer) => {
    window.open(claudeConfigUrl(s.id), '_blank');
    toast.success(`Downloading claude_desktop_config_${s.name.toLowerCase().replace(/\s+/g, '-')}.json`);
  };

  return (
    <div className="space-y-3 p-4" data-testid="mcp-servers-tab">
      {/* Mode pills */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 rounded-md bg-surface/40 p-0.5" data-testid="servers-surface-pills">
          {([
            ['catalog', 'Browse Catalog', BookOpen],
            ['my',      'My Servers',     User],
          ] as const).map(([k, label, Icon]) => (
            <button
              key={k}
              data-testid={`servers-surface-${k}`}
              onClick={() => setSurface(k)}
              className={cn(
                'flex items-center gap-1.5 rounded px-3 py-1.5 text-xs transition-colors',
                surface === k ? 'bg-primary text-white' : 'text-text-secondary hover:bg-hover hover:text-text-primary',
              )}
            >
              <Icon className="h-3 w-3" />
              {label}
              {k === 'my' && servers.length > 0 && (
                <span className="rounded bg-black/20 px-1 font-mono text-[9px]">{servers.length}</span>
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-text-muted" />
            <input
              data-testid="servers-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search servers…"
              className="h-7 w-56 rounded-md border border-border bg-probestack-bg pl-7 pr-2 text-xs outline-none focus:border-primary"
            />
          </div>
          <Button variant="primary" data-testid="servers-add" onClick={() => setCreating(true)}>
            <Plus className="h-3.5 w-3.5" /> Register Server
          </Button>
        </div>
      </div>

      {/* Catalog filter chips (Postman-style) */}
      {surface === 'catalog' && (
        <div className="flex flex-wrap items-center gap-1.5" data-testid="catalog-filter-chips">
          <ChipGroup label="License" testId="chip-license">
            <Chip active={catLicense === 'ANY'}         onClick={() => setCatLicense('ANY')}         testId="chip-license-any">All</Chip>
            <Chip active={catLicense === 'OPEN_SOURCE'} onClick={() => setCatLicense('OPEN_SOURCE')} testId="chip-license-oss">Open source</Chip>
            <Chip active={catLicense === 'PROPRIETARY'} onClick={() => setCatLicense('PROPRIETARY')} testId="chip-license-prop">Proprietary</Chip>
          </ChipGroup>
          <ChipGroup label="Pricing" testId="chip-pricing">
            <Chip active={catPricing === 'ANY'}      onClick={() => setCatPricing('ANY')}      testId="chip-pricing-any">All</Chip>
            <Chip active={catPricing === 'FREE'}     onClick={() => setCatPricing('FREE')}     testId="chip-pricing-free">Free</Chip>
            <Chip active={catPricing === 'FREEMIUM'} onClick={() => setCatPricing('FREEMIUM')} testId="chip-pricing-freemium">Freemium</Chip>
            <Chip active={catPricing === 'PAID'}     onClick={() => setCatPricing('PAID')}     testId="chip-pricing-paid">Paid</Chip>
          </ChipGroup>
          <ChipGroup label="Visibility" testId="chip-visibility">
            <Chip active={catVisibility === 'ANY'}        onClick={() => setCatVisibility('ANY')}        testId="chip-visibility-any">All</Chip>
            <Chip active={catVisibility === 'PUBLIC'}     onClick={() => setCatVisibility('PUBLIC')}     testId="chip-visibility-public">Public</Chip>
            <Chip active={catVisibility === 'RESTRICTED'} onClick={() => setCatVisibility('RESTRICTED')} testId="chip-visibility-restricted">Restricted</Chip>
          </ChipGroup>
          <ChipGroup label="Source" testId="chip-source">
            <Chip active={catOfficial === 'ANY'}       onClick={() => setCatOfficial('ANY')}       testId="chip-source-any">All</Chip>
            <Chip active={catOfficial === 'OFFICIAL'}  onClick={() => setCatOfficial('OFFICIAL')}  testId="chip-source-official">Official</Chip>
            <Chip active={catOfficial === 'COMMUNITY'} onClick={() => setCatOfficial('COMMUNITY')} testId="chip-source-community">Community</Chip>
          </ChipGroup>
          {(catalog?.categories?.length ?? 0) > 0 && (
            <div className="flex items-center gap-1">
              <span className="ml-1 text-[10px] font-semibold uppercase tracking-wide text-text-muted">Category</span>
              <select
                data-testid="chip-category"
                value={catCategory}
                onChange={(e) => setCatCategory(e.target.value)}
                className="h-6 rounded-full border border-border bg-probestack-bg px-2 text-[11px] text-text-secondary"
              >
                <option value="ALL">All</option>
                {(catalog?.categories ?? []).map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}
          {activeFilterCount > 0 && (
            <button
              data-testid="catalog-reset-filters"
              onClick={resetCatFilters}
              className="ml-auto rounded-full border border-border px-2.5 py-0.5 text-[11px] text-text-muted hover:border-primary/40 hover:text-primary"
            >
              Reset · {activeFilterCount}
            </button>
          )}
        </div>
      )}

      {/* My-Servers filter chips */}
      {surface === 'my' && (
        <div className="flex items-center gap-1.5" data-testid="servers-filter-chips">
          {([
            ['ALL',     'All',     servers.length],
            ['MINE',    'Mine',    servers.filter((s) => s.source === 'USER').length],
            ['CATALOG', 'Catalog', servers.filter((s) => s.source === 'CATALOG').length],
            ['MOCKS',   'Mocks',   servers.filter((s) => s.isMock).length],
          ] as const).map(([k, label, count]) => (
            <button
              key={k}
              data-testid={`servers-chip-${k.toLowerCase()}`}
              onClick={() => setFilter(k as any)}
              className={cn(
                'rounded-full border px-2.5 py-0.5 text-[11px] transition-colors',
                filter === k
                  ? 'border-primary bg-primary-muted text-primary'
                  : 'border-border bg-probestack-bg text-text-secondary hover:border-primary/40 hover:text-primary',
              )}
            >
              {label}
              <span className="ml-1 font-mono text-[10px] opacity-70">{count}</span>
            </button>
          ))}
        </div>
      )}

      {/* Catalog grid */}
      {surface === 'catalog' && (
        <div data-testid="servers-catalog-grid">
          {loadingCat ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-36 w-full" />)}
            </div>
          ) : (catalog?.items ?? []).length === 0 ? (
            <div className="rounded-md border border-dashed border-border bg-surface/30 p-8 text-center text-xs text-text-muted">
              No catalog matches.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(catalog?.items ?? []).map((c) => {
                const installed = servers.find((s) => (s as any).catalogSlug === c.slug || s.serverUrl === c.serverUrl);
                return (
                  <CatalogCard
                    key={c.slug}
                    entry={c}
                    installed={!!installed}
                    onConnect={() => setConnecting(c)}
                    onUse={() => installed && useAsActive(installed)}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* My-Servers grid */}
      {surface === 'my' && (
        <div data-testid="servers-my-grid">
          {loadingMy ? (
            <Skeleton className="h-40 w-full" />
          ) : filteredMy.length === 0 ? (
            <div className="rounded-md border border-dashed border-border bg-surface/30 p-8 text-center" data-testid="servers-my-empty">
              <Server className="mx-auto mb-2 h-10 w-10 text-text-muted" />
              <h4 className="text-sm font-semibold">No servers match</h4>
              <p className="mt-1 text-xs text-text-muted">
                Browse the <strong>Catalog</strong> to discover open-source MCPs, or register a custom one.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredMy.map((s) => (
                <MyServerCard
                  key={s.id}
                  server={s}
                  active={activeServerId === s.id}
                  busyProbe={busyProbe === s.id}
                  onUse={() => useAsActive(s)}
                  onProbe={() => probe(s.id)}
                  onEdit={() => setEditing(s)}
                  onDelete={async () => {
                    if (!confirm(`Delete "${s.name}"? This cannot be undone.`)) return;
                    await deleteServer(s.id);
                    if (activeServerId === s.id) setActiveServer(null);
                    await qc.invalidateQueries({ queryKey: ['mcp-servers'] });
                    toast.success('Server deleted');
                  }}
                  onCopyUrl={async () => {
                    await navigator.clipboard.writeText(s.serverUrl);
                    toast.success('URL copied');
                  }}
                  onClaudeConfig={() => downloadClaudeConfig(s)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {(creating || editing) && (
        <ServerEditModal
          initial={editing ?? undefined}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={async () => {
            await qc.invalidateQueries({ queryKey: ['mcp-servers'] });
            setCreating(false); setEditing(null);
          }}
          workspaceId={ws?.id}
        />
      )}
      {connecting && (
        <ConnectFromCatalogModal
          entry={connecting}
          workspaceId={ws?.id}
          onClose={() => setConnecting(null)}
          onConnected={async (s) => {
            await qc.invalidateQueries({ queryKey: ['mcp-servers'] });
            setConnecting(null);
            useAsActive(s);
          }}
        />
      )}
    </div>
  );
};

/* ───── Catalog card ────────────────────────────────────────────────── */

const CatalogCard = ({ entry, installed, onConnect, onUse }: {
  entry: McpCatalogEntry; installed: boolean; onConnect: () => void; onUse: () => void;
}) => (
  <div className="flex flex-col rounded-lg border border-border bg-surface/50 p-3 transition-colors hover:border-primary/40" data-testid={`catalog-card-${entry.slug}`}>
    <div className="flex items-start gap-2">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
        <Globe className="h-4 w-4 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-semibold">{entry.name}</span>
          {entry.official && (
            <Tooltip content="Official — vendor-maintained">
              <ShieldCheck className="h-3 w-3 text-success" />
            </Tooltip>
          )}
          {entry.requiresAuth && (
            <Tooltip content={entry.authHelp ?? 'Requires auth'}>
              <ShieldCheck className="h-3 w-3 text-warning" />
            </Tooltip>
          )}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[10px] text-text-muted">
          <span className="rounded bg-elevated px-1 font-mono">{entry.transport}</span>
          <span className="rounded bg-elevated px-1">{entry.category}</span>
          {entry.license === 'OPEN_SOURCE' && (
            <span className="rounded bg-emerald-500/10 px-1 font-semibold text-emerald-500">OSS</span>
          )}
          {entry.pricing === 'FREE' && (
            <span className="rounded bg-success-muted px-1 font-semibold text-success">Free</span>
          )}
          {entry.pricing === 'FREEMIUM' && (
            <span className="rounded bg-info/10 px-1 font-semibold text-info">Freemium</span>
          )}
          {entry.pricing === 'PAID' && (
            <span className="rounded bg-warning-muted px-1 font-semibold text-warning">Paid</span>
          )}
          {entry.visibility === 'PUBLIC' && (
            <span className="rounded bg-elevated px-1">Public</span>
          )}
        </div>
      </div>
    </div>
    <p className="mt-2 line-clamp-2 text-[11px] text-text-secondary">{entry.description}</p>
    <div className="mt-2 flex flex-wrap gap-1">
      {(entry.tags ?? []).map((t) => (
        <span key={t} className="rounded bg-elevated px-1.5 py-0.5 text-[9px] text-text-muted">{t}</span>
      ))}
    </div>
    <div className="mt-3 flex items-center gap-1.5">
      {installed ? (
        <>
          <Button variant="primary" data-testid={`catalog-use-${entry.slug}`} onClick={onUse} className="flex-1">
            <CheckCircle2 className="h-3.5 w-3.5" /> Use
          </Button>
          <Tooltip content="Open homepage">
            <a href={entry.homepage} target="_blank" rel="noreferrer" className="flex h-7 w-7 items-center justify-center rounded text-text-muted hover:bg-hover hover:text-primary">
              <ExternalLink className="h-3 w-3" />
            </a>
          </Tooltip>
        </>
      ) : entry.transport === 'STDIO' ? (
        <>
          <Tooltip content="STDIO servers need a local process and can't be connected from the web UI. Use a STREAMABLE_HTTP / SSE catalog entry (DeepWiki, GitHub, Sentry) or run a local HTTP bridge.">
            <span
              data-testid={`catalog-stdio-disabled-${entry.slug}`}
              className="flex flex-1 items-center justify-center gap-1 rounded border border-warning/40 bg-warning-muted px-2 py-1 text-[10px] font-medium text-warning"
            >
              <AlertTriangle className="h-3 w-3" /> STDIO — not supported in web
            </span>
          </Tooltip>
          <Tooltip content="Open homepage">
            <a href={entry.homepage} target="_blank" rel="noreferrer" className="flex h-7 w-7 items-center justify-center rounded text-text-muted hover:bg-hover hover:text-primary">
              <ExternalLink className="h-3 w-3" />
            </a>
          </Tooltip>
        </>
      ) : (
        <>
          <Button  data-testid={`catalog-connect-${entry.slug}`} onClick={onConnect} className="flex-1 border-primary/30 bg-primary/10 hover:bg-primary/20">
            <Sparkles className="h-3.5 w-3.5" /> Connect
          </Button>
          <Tooltip content="Open homepage">
            <a href={entry.homepage} target="_blank" rel="noreferrer" className="flex h-7 w-7 items-center justify-center rounded text-text-muted hover:bg-hover hover:text-primary">
              <ExternalLink className="h-3 w-3" />
            </a>
          </Tooltip>
        </>
      )}
    </div>
  </div>
);

/* ───── My-Server card ──────────────────────────────────────────────── */

const MyServerCard = ({
  server, active, busyProbe, onUse, onProbe, onEdit, onDelete, onCopyUrl, onClaudeConfig,
}: {
  server: McpServer; active: boolean; busyProbe: boolean;
  onUse: () => void; onProbe: () => void; onEdit: () => void;
  onDelete: () => void; onCopyUrl: () => void; onClaudeConfig: () => void;
}) => (
  <div data-testid={`my-server-${server.id}`} className={cn(
    'flex flex-col rounded-lg border bg-surface/50 p-3 transition-colors',
    active ? 'border-primary' : 'border-border hover:border-primary/40',
  )}>
    <div className="flex items-start gap-2">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
        {server.isMock ? <Boxes className="h-4 w-4 text-primary" /> : <Server className="h-4 w-4 text-primary" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-semibold">{server.name}</span>
          {active && <span className="rounded bg-primary text-[8px] font-bold uppercase tracking-wide text-white px-1">selected</span>}
          {server.source === 'CATALOG' && (
            <span className="rounded bg-primary-muted px-1 font-mono text-[9px] text-primary">CATALOG</span>
          )}
          {server.isMock && (
            <span className="rounded bg-warning-muted px-1 font-mono text-[9px] text-warning">MOCK</span>
          )}
        </div>
        <div className="mt-0.5 truncate font-mono text-[10px] text-text-muted">{server.serverUrl}</div>
      </div>
      <StatusDot status={server.status ?? 'UNKNOWN'} />
    </div>
    <div className="mt-2 flex items-center gap-1 text-[10px]">
      <span className={cn(
        'rounded px-1 font-mono',
        server.transport === 'STDIO'
          ? 'bg-warning-muted text-warning'
          : 'bg-elevated text-text-secondary',
      )}>{server.transport}</span>
      {server.transport === 'STDIO' && (
        <span className="rounded bg-warning-muted px-1 font-mono text-[9px] text-warning" title="STDIO servers need a local process — web UI can't connect. Use the Download button to export a Claude Desktop config instead.">
          not supported in web
        </span>
      )}
      {server.lastProbeMs != null && (
        <span className="font-mono text-text-muted">· {server.lastProbeMs}ms</span>
      )}
      {server.connectedByName && (
        <span className="ml-auto truncate text-text-muted">by {server.connectedByName}</span>
      )}
    </div>
    <div className="mt-3 flex items-center gap-1">
      <Button
        variant={active ? 'outline' : 'primary'}
        data-testid={`my-server-use-${server.id}`}
        onClick={onUse}
        disabled={server.transport === 'STDIO'}
        title={server.transport === 'STDIO' ? "STDIO transport can't connect from the web UI — download the Claude Desktop config instead." : undefined}
        className="flex-1 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {active ? <><CheckCircle2 className="h-3.5 w-3.5" /> Selected</> : <><Activity className="h-3.5 w-3.5" /> Use</>}
      </Button>
      <Tooltip content="Probe (initialize)">
        <button data-testid={`my-server-probe-${server.id}`} onClick={onProbe} disabled={busyProbe || server.transport === 'STDIO'}
                className="flex h-7 w-7 items-center justify-center rounded text-text-muted hover:bg-hover hover:text-primary disabled:opacity-50">
          {busyProbe ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
        </button>
      </Tooltip>
      <Tooltip content="Copy URL">
        <button data-testid={`my-server-copy-${server.id}`} onClick={onCopyUrl}
                className="flex h-7 w-7 items-center justify-center rounded text-text-muted hover:bg-hover hover:text-primary">
          <Copy className="h-3 w-3" />
        </button>
      </Tooltip>
      <Tooltip content="Download Claude Desktop config">
        <button data-testid={`my-server-claude-${server.id}`} onClick={onClaudeConfig}
                className="flex h-7 w-7 items-center justify-center rounded text-text-muted hover:bg-hover hover:text-primary">
          <Download className="h-3 w-3" />
        </button>
      </Tooltip>
      <Tooltip content="Edit">
        <button data-testid={`my-server-edit-${server.id}`} onClick={onEdit}
                className="flex h-7 w-7 items-center justify-center rounded text-text-muted hover:bg-hover hover:text-primary">
          <Pencil className="h-3 w-3" />
        </button>
      </Tooltip>
      <Tooltip content="Delete">
        <button data-testid={`my-server-del-${server.id}`} onClick={onDelete}
                className="flex h-7 w-7 items-center justify-center rounded text-text-muted hover:bg-hover hover:text-danger">
          <Trash2 className="h-3 w-3" />
        </button>
      </Tooltip>
    </div>
  </div>
);

const StatusDot = ({ status }: { status: 'UP' | 'DOWN' | 'UNKNOWN' }) => (
  <Tooltip content={`Status: ${status}`}>
    <span data-testid={`status-dot-${status}`} className={cn(
      'mt-1 inline-block h-2 w-2 rounded-full',
      status === 'UP' ? 'bg-success' : status === 'DOWN' ? 'bg-danger' : 'bg-text-muted',
    )} />
  </Tooltip>
);

/* ───── Connect-from-catalog modal ──────────────────────────────────── */

const ConnectFromCatalogModal = ({
  entry, workspaceId, onClose, onConnected,
}: {
  entry: McpCatalogEntry; workspaceId?: string;
  onClose: () => void; onConnected: (s: McpServer) => void;
}) => {
  const [name, setName]   = useState(entry.name);
  const [url, setUrl]     = useState(entry.serverUrl);
  const [headers, setHeaders] = useState<{ key: string; value: string }[]>([]);
  const [busy, setBusy]   = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      const s = await connectFromCatalog(entry.slug, {
        workspaceId, name, serverUrl: url, transport: entry.transport,
        authHeaders: headers.filter((h) => h.key.trim()),
      });
      toast.success(`Connected: ${s.name}`);
      onConnected(s);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? e?.message ?? 'Connect failed');
    } finally { setBusy(false); }
  };

  return (
    <Modal
      open
      onClose={onClose}
      icon={Sparkles}
      title={`Connect to ${entry.name}`}
      size="md"
      testId="catalog-connect-modal"
      footer={
        <>
          <Button variant="outline" data-testid="catalog-connect-cancel" onClick={onClose}>Cancel</Button>
          <Button variant="primary" data-testid="catalog-connect-submit" disabled={busy} onClick={submit}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            Connect server
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {entry.requiresAuth && entry.authHelp && (
          <div className="rounded-md border border-warning/40 bg-warning-muted p-3 text-[11px] text-warning">
            <ShieldCheck className="mr-1 inline h-3 w-3" />
            <strong>Auth required:</strong> {entry.authHelp}
          </div>
        )}
        <Field label="Name">
          <input data-testid="catalog-connect-name" className="h-8 w-full rounded border border-border bg-probestack-bg px-2 text-xs"
                 value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Server URL">
          <input data-testid="catalog-connect-url" className="h-8 w-full rounded border border-border bg-probestack-bg px-2 font-mono text-xs"
                 value={url} onChange={(e) => setUrl(e.target.value)} />
        </Field>
        {entry.requiresAuth && (
          <Field label="Auth headers">
            <div className="space-y-1.5" data-testid="catalog-connect-auth">
              {headers.map((h, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_24px] gap-1.5">
                  <input value={h.key} onChange={(e) => setHeaders(headers.map((x, j) => j === i ? { ...x, key: e.target.value } : x))}
                         placeholder="Header" className="h-7 rounded border border-border bg-probestack-bg px-2 font-mono text-[11px]" />
                  <input value={h.value} onChange={(e) => setHeaders(headers.map((x, j) => j === i ? { ...x, value: e.target.value } : x))}
                         placeholder="Value" className="h-7 rounded border border-border bg-probestack-bg px-2 font-mono text-[11px]" />
                  <button onClick={() => setHeaders(headers.filter((_, j) => j !== i))}
                          className="flex h-7 w-7 items-center justify-center rounded text-text-muted hover:bg-hover hover:text-danger">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <button onClick={() => setHeaders([...headers, { key: 'Authorization', value: '' }])}
                      data-testid="catalog-connect-add-header" className="text-[10px] text-primary hover:underline">+ Add header</button>
            </div>
          </Field>
        )}
      </div>
    </Modal>
  );
};

/* ───── Generic edit modal (custom servers) ─────────────────────────── */

const TRANSPORTS: McpTransport[] = ['STREAMABLE_HTTP', 'SSE', 'STDIO'];

const ServerEditModal = ({
  initial, onClose, onSaved, workspaceId,
}: {
  initial?: McpServer;
  onClose: () => void; onSaved: () => Promise<void>;
  workspaceId?: string;
}) => {
  const [name, setName]               = useState(initial?.name ?? '');
  const [serverUrl, setServerUrl]     = useState(initial?.serverUrl ?? '');
  const [transport, setTransport]     = useState<McpTransport>(initial?.transport ?? 'STREAMABLE_HTTP');
  const [headers, setHeaders]         = useState<{ key: string; value: string }[]>(initial?.authHeaders ?? []);
  const [busy, setBusy]               = useState(false);

  const valid = name.trim().length > 0 && serverUrl.trim().length > 0;

  const save = async () => {
    setBusy(true);
    try {
      const body = { name, serverUrl, transport, authHeaders: headers.filter((h) => h.key.trim()), workspaceId };
      if (initial) await updateServer(initial.id, body);
      else await createServer({ ...body, source: 'USER' as any });
      toast.success(initial ? 'Server updated' : 'Server registered');
      await onSaved();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? e?.message ?? 'Save failed');
    } finally { setBusy(false); }
  };

  return (
    <Modal
      open
      onClose={onClose}
      icon={Server}
      title={initial ? `Edit ${initial.name}` : 'Register custom MCP server'}
      size="md"
      testId="server-edit-modal"
      footer={
        <>
          <Button variant="outline" data-testid="server-edit-cancel" onClick={onClose}>Cancel</Button>
          <Button variant="primary" data-testid="server-edit-save" disabled={!valid || busy} onClick={save}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            {initial ? 'Save' : 'Register'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Name *">
          <input data-testid="server-edit-name" className="h-8 w-full rounded border border-border bg-probestack-bg px-2 text-xs"
                 value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Server URL *">
          <input data-testid="server-edit-url" className="h-8 w-full rounded border border-border bg-probestack-bg px-2 font-mono text-xs"
                 value={serverUrl} onChange={(e) => setServerUrl(e.target.value)} placeholder="https://…/mcp" />
        </Field>
        <Field label="Transport">
          <select data-testid="server-edit-transport" value={transport} onChange={(e) => setTransport(e.target.value as McpTransport)}
                  className="h-8 w-full rounded border border-border bg-probestack-bg px-2 text-xs">
            {TRANSPORTS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Auth headers">
          <div className="space-y-1.5">
            {headers.map((h, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_24px] gap-1.5">
                <input value={h.key} onChange={(e) => setHeaders(headers.map((x, j) => j === i ? { ...x, key: e.target.value } : x))}
                       placeholder="Header" className="h-7 rounded border border-border bg-probestack-bg px-2 font-mono text-[11px]" />
                <input value={h.value} onChange={(e) => setHeaders(headers.map((x, j) => j === i ? { ...x, value: e.target.value } : x))}
                       placeholder="Value" className="h-7 rounded border border-border bg-probestack-bg px-2 font-mono text-[11px]" />
                <button onClick={() => setHeaders(headers.filter((_, j) => j !== i))}
                        className="flex h-7 w-7 items-center justify-center rounded text-text-muted hover:bg-hover hover:text-danger">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
            <button onClick={() => setHeaders([...headers, { key: '', value: '' }])}
                    className="text-[10px] text-primary hover:underline">+ Add header</button>
          </div>
        </Field>
      </div>
    </Modal>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-text-muted">{label}</div>
    {children}
  </div>
);

/* ───── Filter-chip primitives ─────────────────────────────────────── */

const ChipGroup = ({ label, testId, children }: { label: string; testId: string; children: React.ReactNode }) => (
  <div className="flex items-center gap-1" data-testid={testId}>
    <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">{label}</span>
    <div className="flex items-center gap-1 rounded-full border border-border bg-surface/40 p-0.5">
      {children}
    </div>
  </div>
);

const Chip = ({ active, onClick, testId, children }: {
  active: boolean; onClick: () => void; testId: string; children: React.ReactNode;
}) => (
  <button
    data-testid={testId}
    onClick={onClick}
    className={cn(
      'rounded-full px-2.5 py-0.5 text-[11px] transition-colors',
      active
        ? 'bg-primary text-white shadow-sm'
        : 'text-text-secondary hover:bg-hover hover:text-primary',
    )}
  >
    {children}
  </button>
);
