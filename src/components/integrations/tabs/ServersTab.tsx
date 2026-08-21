/**
 * ServersTab — MCP server browser with marketplace-style UI (no carousel).
 *
 *   • Two surfaces: Browse Catalog | My Servers (pills).
 *   • Search + Filters popover (License, Pricing, Visibility, Source).
 *   • Cards with consistent height and actions aligned at bottom.
 *   • Pagination: 60 cards initially, load more 20 at a time.
 *   • All existing logic (connect, probe, use, save, etc.) preserved.
 */
import { useMemo, useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Server,
  RefreshCw,
  Loader2,
  Pencil,
  Trash2,
  Activity,
  Copy,
  Search,
  ExternalLink,
  ShieldCheck,
  Globe,
  Boxes,
  User,
  Download,
  Sparkles,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tooltip } from "@/components/ui/Tooltip";
import { Modal } from "@/components/ui/Modal";
import { useWorkspaceStore } from "@/stores/workspace.store";
import { useMcpStudioStore } from "@/stores/mcp-studio.store";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { ConnectFromCatalogModal } from "./ConnectFromCatalogModal";
import {
  listServers,
  createServer,
  updateServer,
  deleteServer,
  probeServer,
  listCatalog,
  connectFromCatalog,
  claudeConfigUrl,
  type McpServer,
  type McpTransport,
  type McpCatalogEntry,
} from "@/services/mcp.service";
import { cn } from "@/utils/cn";

// Local type aliases (since types are not exported)
type CatalogLicense = "ANY" | "OPEN_SOURCE" | "PROPRIETARY";
type CatalogPricing = "ANY" | "FREE" | "FREEMIUM" | "PAID";
type CatalogVisibility = "ANY" | "PUBLIC" | "RESTRICTED";
type CatalogOfficial = "ANY" | "OFFICIAL" | "COMMUNITY";

type Surface = "catalog" | "my";

export const ServersTab = () => {
  const confirm = useConfirm();
  const ws = useWorkspaceStore((s) => s.current);
  const filter = useMcpStudioStore((s) => s.serversFilter);
  const setFilter = useMcpStudioStore((s) => s.setServersFilter);
  const search = useMcpStudioStore((s) => s.serversSearch);
  const setSearch = useMcpStudioStore((s) => s.setServersSearch);
  const setActiveServer = useMcpStudioStore((s) => s.setActiveServer);
  const activeServerId = useMcpStudioStore((s) => s.activeServerId);
  const setTab = useMcpStudioStore((s) => s.setTab);

  const catLicense = useMcpStudioStore((s) => s.catalogLicense);
  const catPricing = useMcpStudioStore((s) => s.catalogPricing);
  const catVisibility = useMcpStudioStore((s) => s.catalogVisibility);
  const catOfficial = useMcpStudioStore((s) => s.catalogOfficial);
  const catCategory = useMcpStudioStore((s) => s.catalogCategory);
  const setCatLicense = useMcpStudioStore((s) => s.setCatalogLicense);
  const setCatPricing = useMcpStudioStore((s) => s.setCatalogPricing);
  const setCatVisibility = useMcpStudioStore((s) => s.setCatalogVisibility);
  const setCatOfficial = useMcpStudioStore((s) => s.setCatalogOfficial);
  const setCatCategory = useMcpStudioStore((s) => s.setCatalogCategory);
  const resetCatFilters = useMcpStudioStore((s) => s.resetCatalogFilters);

  const [surface, setSurface] = useState<Surface>("catalog");
  const [editing, setEditing] = useState<McpServer | null>(null);
  const [creating, setCreating] = useState(false);
  const [connecting, setConnecting] = useState<McpCatalogEntry | null>(null);
  const [busyProbe, setBusyProbe] = useState<string | null>(null);

  // Popover state
  const [showFilters, setShowFilters] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  const qc = useQueryClient();

  const { data: servers = [], isLoading: loadingMy } = useQuery({
    queryKey: ["mcp-servers", ws?.id],
    queryFn: () => listServers(ws?.id),
  });
  const { data: catalog, isLoading: loadingCat } = useQuery({
    queryKey: [
      "mcp-catalog",
      search,
      catLicense,
      catPricing,
      catVisibility,
      catOfficial,
      catCategory,
    ],
    queryFn: () =>
      listCatalog({
        q: search || undefined,
        license: catLicense === "ANY" ? undefined : catLicense,
        pricing: catPricing === "ANY" ? undefined : catPricing,
        visibility: catVisibility === "ANY" ? undefined : catVisibility,
        official:
          catOfficial === "ANY" ? undefined : catOfficial === "OFFICIAL",
        category: catCategory === "ALL" ? undefined : catCategory,
      }),
  });

  const activeFilterCount =
    (catLicense !== "ANY" ? 1 : 0) +
    (catPricing !== "ANY" ? 1 : 0) +
    (catVisibility !== "ANY" ? 1 : 0) +
    (catOfficial !== "ANY" ? 1 : 0) +
    (catCategory !== "ALL" ? 1 : 0);

  const filteredMy = useMemo(() => {
    return servers.filter((s) => {
      if (filter === "MINE" && s.source !== "USER") return false;
      if (filter === "CATALOG" && s.source !== "CATALOG") return false;
      if (filter === "MOCKS" && !s.isMock) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          s.name +
          " " +
          (s.serverUrl || "") +
          " " +
          (s.description || "")
        )
          .toLowerCase()
          .includes(q);
      }
      return true;
    });
  }, [servers, filter, search]);

  // Click outside to close filter popover
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowFilters(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ---- Helpers ----
  const probe = async (id: string) => {
    setBusyProbe(id);
    try {
      const r = await probeServer(id);
      toast[r.status === "UP" ? "success" : "error"](
        `${r.status} · ${r.latencyMs}ms${r.error ? " · " + r.error : ""}`,
      );
      await qc.invalidateQueries({ queryKey: ["mcp-servers"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Probe failed");
    } finally {
      setBusyProbe(null);
    }
  };

  const useAsActive = (s: McpServer) => {
    setActiveServer(s.id);
    setTab("inspector");
    toast.success(`Active: ${s.name}`);
  };

  const downloadClaudeConfig = (s: McpServer) => {
    window.open(claudeConfigUrl(s.id), "_blank");
    toast.success(
      `Downloading claude_desktop_config_${s.name.toLowerCase().replace(/\s+/g, "-")}.json`,
    );
  };

  // Clear all catalog filters
  const clearCatalogFilters = () => {
    resetCatFilters();
    setSearch("");
  };

  // Generic toggle filter – fixes TypeScript errors
  const toggleFilter = <T extends string>(
    current: T,
    setter: (v: T) => void,
    value: T,
  ) => {
    setter(current === value ? ("ANY" as T) : value);
  };

  // ---- Render ----
  return (
    <div className="space-y-6 p-6" data-testid="mcp-servers-tab">
      {/* ─── Header ─── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-1 rounded-lg border border-border bg-surface/40 p-1">
          {(
            [
              [
                "catalog",
                "Browse Catalog",
                BookOpen,
                catalog?.items?.length ?? 0,
              ],
              ["my", "My Servers", User, servers.length],
            ] as const
          ).map(([k, label, Icon, count]) => (
            <button
              key={k}
              data-testid={`servers-surface-${k}`}
              onClick={() => setSurface(k)}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition-colors",
                surface === k
                  ? "bg-primary text-white shadow-sm"
                  : "text-text-secondary hover:bg-elevated hover:text-text-primary",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
              <span className="rounded-full bg-black/10 px-1.5 text-xs font-mono">
                {count}
              </span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Tooltip content="Refresh catalog">
            <button
              onClick={() =>
                qc.invalidateQueries({ queryKey: ["mcp-catalog"] })
              }
              className="rounded-lg border border-border bg-surface p-2 text-text-secondary hover:bg-elevated hover:text-text-primary transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </Tooltip>
          <Button
            variant="primary"
            data-testid="servers-add"
            onClick={() => setCreating(true)}
          >
            <Plus className="h-4 w-4 mr-1" /> Register Server
          </Button>
        </div>
      </div>

      {/* ─── Surface Pills ─── */}
      <div className="flex items-center gap-2">
        <div>
          <div className="flex items-center gap-3 text-sm text-text-muted">
            <span>{catalog?.items?.length ?? 0} catalog entries</span>
            <span className="h-1 w-1 rounded-full bg-text-muted/30" />
            <span>{servers.length} saved servers</span>
            {servers.some((s) => s.isMock) && (
              <>
                <span className="h-1 w-1 rounded-full bg-text-muted/30" />
                <span className="text-warning">
                  {servers.filter((s) => s.isMock).length} mocks
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ─── Filter Bar ─── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              surface === "catalog" ? "Search catalog…" : "Search my servers…"
            }
            className="w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-3 text-sm outline-none focus:border-primary transition-colors"
          />
        </div>

        {/* Filters button (only in catalog) */}
        {surface === "catalog" && (
          <div className="relative" ref={filterRef}>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
                showFilters
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border bg-surface text-text-secondary hover:bg-elevated hover:text-text-primary",
              )}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="rounded-full bg-primary px-1.5 text-xs text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {showFilters && (
              <div className="absolute right-0 top-full mt-2 w-72 rounded-xl border border-border bg-surface p-4 shadow-lg z-20">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold">
                    Advanced Filters
                  </span>
                  <button
                    onClick={() => setShowFilters(false)}
                    className="text-text-muted hover:text-text-primary"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-3 max-h-60 overflow-y-auto">
                  <FilterGroup
                    label="License"
                    options={["OPEN_SOURCE", "PROPRIETARY"]}
                    selected={catLicense}
                    onToggle={(v) =>
                      toggleFilter(
                        catLicense,
                        setCatLicense,
                        v as CatalogLicense,
                      )
                    }
                    labelMap={{
                      OPEN_SOURCE: "Open source",
                      PROPRIETARY: "Proprietary",
                    }}
                  />
                  <FilterGroup
                    label="Pricing"
                    options={["FREE", "FREEMIUM", "PAID"]}
                    selected={catPricing}
                    onToggle={(v) =>
                      toggleFilter(
                        catPricing,
                        setCatPricing,
                        v as CatalogPricing,
                      )
                    }
                    labelMap={{
                      FREE: "Free",
                      FREEMIUM: "Freemium",
                      PAID: "Paid",
                    }}
                  />
                  <FilterGroup
                    label="Visibility"
                    options={["PUBLIC", "RESTRICTED"]}
                    selected={catVisibility}
                    onToggle={(v) =>
                      toggleFilter(
                        catVisibility,
                        setCatVisibility,
                        v as CatalogVisibility,
                      )
                    }
                    labelMap={{ PUBLIC: "Public", RESTRICTED: "Restricted" }}
                  />
                  <FilterGroup
                    label="Source"
                    options={["OFFICIAL", "COMMUNITY"]}
                    selected={catOfficial}
                    onToggle={(v) =>
                      toggleFilter(
                        catOfficial,
                        setCatOfficial,
                        v as CatalogOfficial,
                      )
                    }
                    labelMap={{ OFFICIAL: "Official", COMMUNITY: "Community" }}
                  />
                </div>

                <div className="mt-3 flex justify-between">
                  <button
                    onClick={clearCatalogFilters}
                    className="text-xs text-text-muted hover:text-text-primary"
                  >
                    Clear all
                  </button>
                  <button
                    onClick={() => setShowFilters(false)}
                    className="text-xs text-primary font-medium hover:underline"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Content ─── */}
      {surface === "catalog" ? (
        <CatalogContent
          loading={loadingCat}
          catalog={catalog}
          servers={servers}
          onConnect={setConnecting}
          onUse={(s) => useAsActive(s)}
        />
      ) : (
        <MyServersContent
          loading={loadingMy}
          servers={filteredMy}
          activeServerId={activeServerId}
          busyProbe={busyProbe}
          onUse={useAsActive}
          onProbe={probe}
          onEdit={setEditing}
          onDelete={async (id) => {
            const ok = await confirm({
              title: "Delete server?",
              description: `This will remove the server from your saved list.`,
              tone: "danger",
              confirmText: "Delete",
              testId: `confirm-server-del-${id}`,
            });
            if (!ok) return;
            await deleteServer(id);
            if (activeServerId === id) setActiveServer(null);
            await qc.invalidateQueries({ queryKey: ["mcp-servers"] });
            toast.success("Server deleted");
          }}
          onCopyUrl={async (url) => {
            await navigator.clipboard.writeText(url);
            toast.success("URL copied");
          }}
          onClaudeConfig={downloadClaudeConfig}
        />
      )}

      {/* ─── Modals (unchanged) ─── */}
      {(creating || editing) && (
        <ServerEditModal
          initial={editing ?? undefined}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={async () => {
            await qc.invalidateQueries({ queryKey: ["mcp-servers"] });
            setCreating(false);
            setEditing(null);
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
            await qc.invalidateQueries({ queryKey: ["mcp-servers"] });
            setConnecting(null);
            useAsActive(s);
          }}
        />
      )}
    </div>
  );
};

/* ─── Catalog Content with Pagination ────────────────────────────────── */
const CatalogContent = ({
  loading,
  catalog,
  servers,
  onConnect,
  onUse,
}: {
  loading: boolean;
  catalog: any;
  servers: McpServer[];
  onConnect: (entry: McpCatalogEntry) => void;
  onUse: (s: McpServer) => void;
}) => {
  const [visibleCount, setVisibleCount] = useState(50);
  const items = catalog?.items ?? [];

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + 20);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-surface p-4 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 animate-pulse rounded-lg bg-hover" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 animate-pulse rounded bg-hover" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-hover" />
              </div>
            </div>
            <div className="mt-3 space-y-1.5">
              <div className="h-3 w-full animate-pulse rounded bg-hover" />
              <div className="h-3 w-2/3 animate-pulse rounded bg-hover" />
            </div>
            <div className="mt-4 flex gap-2">
              <div className="h-9 flex-1 animate-pulse rounded bg-hover" />
              <div className="h-9 w-12 animate-pulse rounded bg-hover" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface p-12 text-center">
        <Globe className="h-10 w-10 text-text-muted opacity-40" />
        <h3 className="mt-3 text-base font-semibold">No catalog entries</h3>
        <p className="text-sm text-text-muted">
          Try adjusting your filters or register a custom server.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 rounded-lg border border-border px-4 py-1.5 text-sm font-medium hover:bg-elevated transition-colors"
        >
          Refresh
        </button>
      </div>
    );
  }

  const visibleItems = items.slice(0, visibleCount);
  const hasMore = visibleCount < items.length;

  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {visibleItems.map((entry: McpCatalogEntry) => {
          const installed = servers.find(
            (s) =>
              (s as any).catalogSlug === entry.slug ||
              s.serverUrl === entry.serverUrl,
          );
          return (
            <CatalogCard
              key={entry.slug}
              entry={entry}
              installed={!!installed}
              onConnect={() => onConnect(entry)}
              onUse={() => installed && onUse(installed)}
            />
          );
        })}
      </div>
      {hasMore && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={handleLoadMore}
            className="rounded-lg border border-border px-6 py-2 text-sm font-medium text-text-secondary hover:bg-elevated hover:text-text-primary transition-colors"
          >
            Load more ({Math.min(20, items.length - visibleCount)} remaining)
          </button>
        </div>
      )}
    </>
  );
};

/* ─── My Servers Content (unchanged) ──────────────────────────────── */
const MyServersContent = ({
  loading,
  servers,
  activeServerId,
  busyProbe,
  onUse,
  onProbe,
  onEdit,
  onDelete,
  onCopyUrl,
  onClaudeConfig,
}: {
  loading: boolean;
  servers: McpServer[];
  activeServerId: string | null;
  busyProbe: string | null;
  onUse: (s: McpServer) => void;
  onProbe: (id: string) => void;
  onEdit: (s: McpServer) => void;
  onDelete: (id: string) => void;
  onCopyUrl: (url: string) => void;
  onClaudeConfig: (s: McpServer) => void;
}) => {
  if (loading) {
    return <Skeleton className="h-40 w-full" />;
  }

  if (servers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface p-12 text-center">
        <Server className="h-10 w-10 text-text-muted opacity-40" />
        <h3 className="mt-3 text-base font-semibold">No servers saved</h3>
        <p className="text-sm text-text-muted">
          Browse the catalog to discover and connect MCP servers.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {servers.map((s) => (
        <MyServerCard
          key={s.id}
          server={s}
          active={activeServerId === s.id}
          busyProbe={busyProbe === s.id}
          onUse={() => onUse(s)}
          onProbe={() => onProbe(s.id)}
          onEdit={() => onEdit(s)}
          onDelete={() => onDelete(s.id)}
          onCopyUrl={() => onCopyUrl(s.serverUrl)}
          onClaudeConfig={() => onClaudeConfig(s)}
        />
      ))}
    </div>
  );
};

/* ───── Catalog Card ──────────────────────────────────────────────────── */
const CatalogCard = ({
  entry,
  installed,
  onConnect,
  onUse,
}: {
  entry: McpCatalogEntry;
  installed: boolean;
  onConnect: () => void;
  onUse: () => void;
}) => {
  const isStdio = entry.transport === "STDIO";
  const navigate = useNavigate();
  const handleCardClick = () => {
    navigate(`/projects/mcp/server/${entry.slug}`, { state: { entry } });
  };

  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-surface p-4 shadow-sm transition-all hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5">
      <div
        onClick={handleCardClick}
        className="flex flex-1 flex-col items-start gap-2 cursor-pointer"
      >
        <div className="flex items-start gap-3 w-full">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-elevated">
            <Globe className="h-5 w-5 text-text-secondary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-base font-semibold text-text-primary">
                {entry.name}
              </span>
              {entry.official && (
                <Tooltip content="Official — vendor-maintained">
                  <ShieldCheck className="h-3.5 w-3.5 text-success" />
                </Tooltip>
              )}
              {entry.requiresAuth && (
                <Tooltip content={entry.authHelp ?? "Requires auth"}>
                  <ShieldCheck className="h-3.5 w-3.5 text-warning" />
                </Tooltip>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-text-muted">
              <span className="rounded-full bg-elevated px-1.5 py-0.5 font-mono text-[10px]">
                {entry.transport}
              </span>
              <span>· {entry.category}</span>
            </div>
          </div>
        </div>

        <p className="line-clamp-2 text-sm text-text-secondary flex-1">
          {entry.description}
        </p>

        <div className="flex flex-wrap items-center gap-1.5 mt-1">
          {entry.license === "OPEN_SOURCE" && (
            <Tooltip content="Open Source – free to use and modify">
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-300">
                OSS
              </span>
            </Tooltip>
          )}
          {entry.license === "PROPRIETARY" && (
            <Tooltip content="Proprietary – closed source, commercial license">
              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-300">
                Proprietary
              </span>
            </Tooltip>
          )}
          {entry.pricing === "FREE" && (
            <Tooltip content="Free – no cost to use">
              <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-medium text-green-600 dark:text-green-300">
                Free
              </span>
            </Tooltip>
          )}
          {entry.pricing === "FREEMIUM" && (
            <Tooltip content="Freemium – free tier with paid features">
              <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-600 dark:text-blue-300">
                Freemium
              </span>
            </Tooltip>
          )}
          {entry.pricing === "PAID" && (
            <Tooltip content="Paid – requires payment to use">
              <span className="rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-medium text-warning">
                Paid
              </span>
            </Tooltip>
          )}
          {entry.visibility === "PUBLIC" && (
            <Tooltip content="Public – visible to everyone">
              <span className="rounded-full bg-elevated px-2 py-0.5 text-[10px] font-mono text-text-secondary">
                Public
              </span>
            </Tooltip>
          )}
          {entry.visibility === "RESTRICTED" && (
            <Tooltip content="Restricted – limited access, requires permission">
              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-mono text-amber-600 dark:text-amber-300">
                Restricted
              </span>
            </Tooltip>
          )}
          {(entry.tags ?? []).slice(0, 2).map((t) => (
            <Tooltip key={t} content={`Tag: ${t}`}>
              <span className="rounded-full bg-elevated px-2 py-0.5 text-[10px] font-mono text-text-secondary">
                #{t}
              </span>
            </Tooltip>
          ))}
          {(entry.tags ?? []).length > 2 && (
            <span className="text-[10px] text-text-muted">
              +{(entry.tags ?? []).length - 2}
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 shrink-0">
        {installed ? (
          <>
            <Tooltip content="Use this server">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onUse();
                }}
                disabled={isStdio}
                className="flex-1 rounded-lg border border-primary/40 bg-primary/5 py-1.5 text-sm font-semibold text-primary hover:bg-primary/10 hover:border-primary/60 transition-colors disabled:opacity-50"
              >
                <CheckCircle2 className="inline h-4 w-4 mr-1.5" /> Use
              </button>
            </Tooltip>
            <Tooltip content="Open homepage">
              <a
                href={entry.homepage}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="rounded-lg border border-border p-2 text-text-secondary hover:bg-elevated hover:text-text-primary transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </Tooltip>
          </>
        ) : isStdio ? (
          <>
            <Tooltip content="STDIO servers need a local process and can't be connected from the web UI. Use a STREAMABLE_HTTP / SSE catalog entry (DeepWiki, GitHub, Sentry) or run a local HTTP bridge.">
              <span className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-warning/40 bg-warning/5 py-1.5 text-sm font-medium text-warning">
                <AlertTriangle className="h-4 w-4" /> STDIO not supported
              </span>
            </Tooltip>
            <Tooltip content="Open homepage">
              <a
                href={entry.homepage}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="rounded-lg border border-border p-2 text-text-secondary hover:bg-elevated hover:text-text-primary transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </Tooltip>
          </>
        ) : (
          <>
            <Tooltip content="Connect this server">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onConnect();
                }}
                className="flex-1 rounded-lg border border-primary/40 bg-primary/5 py-1.5 text-sm font-semibold text-primary hover:bg-primary/10 hover:border-primary/60 transition-colors"
              >
                <Sparkles className="inline h-4 w-4 mr-1.5" /> Connect
              </button>
            </Tooltip>
            <Tooltip content="Open homepage">
              <a
                href={entry.homepage}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="rounded-lg border border-border p-2 text-text-secondary hover:bg-elevated hover:text-text-primary transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </Tooltip>
          </>
        )}
      </div>
    </div>
  );
};

/* ───── My Server Card (unchanged) ────────────────────────────────── */
const MyServerCard = ({
  server,
  active,
  busyProbe,
  onUse,
  onProbe,
  onEdit,
  onDelete,
  onCopyUrl,
  onClaudeConfig,
}: {
  server: McpServer;
  active: boolean;
  busyProbe: boolean;
  onUse: () => void;
  onProbe: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onCopyUrl: () => void;
  onClaudeConfig: () => void;
}) => {
  const isStdio = server.transport === "STDIO";

  return (
    <div
      data-testid={`my-server-${server.id}`}
      className={cn(
        "flex h-full flex-col rounded-xl border bg-surface p-4 shadow-sm transition-all hover:shadow-md",
        active
          ? "border-primary"
          : "border-border hover:border-primary/30 hover:-translate-y-0.5",
      )}
    >
      <div className="flex flex-1 flex-col items-start gap-2">
        <div className="flex items-start gap-3 w-full">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-elevated">
            {server.isMock ? (
              <Boxes className="h-5 w-5 text-text-secondary" />
            ) : (
              <Server className="h-5 w-5 text-text-secondary" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-base font-semibold text-text-primary">
                {server.name}
              </span>
              {active && (
                <span className="rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
                  selected
                </span>
              )}
              {server.source === "CATALOG" && (
                <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary">
                  CATALOG
                </span>
              )}
              {server.isMock && (
                <span className="rounded-full bg-warning/10 px-1.5 py-0.5 text-[9px] font-bold text-warning">
                  MOCK
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-text-muted">
              <span className="rounded-full bg-elevated px-1.5 py-0.5 font-mono text-[10px]">
                {server.transport}
              </span>
              {server.lastProbeMs != null && (
                <span className="font-mono">· {server.lastProbeMs}ms</span>
              )}
            </div>
          </div>
          <Tooltip content={`Status: ${server.status ?? "UNKNOWN"}`}>
            <span
              className={cn(
                "mt-1 inline-block h-2.5 w-2.5 rounded-full",
                server.status === "UP"
                  ? "bg-success"
                  : server.status === "DOWN"
                    ? "bg-danger"
                    : "bg-text-muted",
              )}
            />
          </Tooltip>
        </div>

        {server.description && (
          <p className="line-clamp-2 text-sm text-text-secondary flex-1">
            {server.description}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-1.5 mt-1">
          {server.connectedByName && (
            <span className="text-[10px] text-text-muted">
              by {server.connectedByName}
            </span>
          )}
          {isStdio && (
            <span className="rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-medium text-warning">
              STDIO – local only
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-1 shrink-0">
        <Tooltip
          content={
            isStdio
              ? "STDIO transport can't connect from the web UI — download the Claude Desktop config instead."
              : "Use this server"
          }
        >
          <button
            onClick={onUse}
            disabled={isStdio}
            className={cn(
              "flex-1 rounded-lg py-1.5 text-sm font-semibold transition-colors",
              active
                ? "border border-primary/40 bg-primary/5 text-primary hover:bg-primary/10"
                : "border border-primary/40 bg-primary/5 text-primary hover:bg-primary/10 hover:border-primary/60",
              isStdio && "opacity-50 cursor-not-allowed",
            )}
          >
            {active ? (
              <>
                <CheckCircle2 className="inline h-4 w-4 mr-1.5" /> Selected
              </>
            ) : (
              <>
                <Activity className="inline h-4 w-4 mr-1.5" /> Use
              </>
            )}
          </button>
        </Tooltip>
        <Tooltip content="Probe">
          <button
            onClick={onProbe}
            disabled={busyProbe || isStdio}
            className="rounded-lg border border-border p-2 text-text-secondary hover:bg-elevated hover:text-text-primary transition-colors disabled:opacity-50"
          >
            {busyProbe ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </button>
        </Tooltip>
        <Tooltip content="Copy URL">
          <button
            onClick={onCopyUrl}
            className="rounded-lg border border-border p-2 text-text-secondary hover:bg-elevated hover:text-text-primary transition-colors"
          >
            <Copy className="h-4 w-4" />
          </button>
        </Tooltip>
        <Tooltip content="Download Claude Desktop config">
          <button
            onClick={onClaudeConfig}
            className="rounded-lg border border-border p-2 text-text-secondary hover:bg-elevated hover:text-text-primary transition-colors"
          >
            <Download className="h-4 w-4" />
          </button>
        </Tooltip>
        <Tooltip content="Edit">
          <button
            onClick={onEdit}
            className="rounded-lg border border-border p-2 text-text-secondary hover:bg-elevated hover:text-text-primary transition-colors"
          >
            <Pencil className="h-4 w-4" />
          </button>
        </Tooltip>
        <Tooltip content="Delete">
          <button
            onClick={onDelete}
            className="rounded-lg border border-border p-2 text-text-secondary hover:bg-elevated hover:text-danger transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </Tooltip>
      </div>
    </div>
  );
};

/* ─── Filter Group Component ──────────────────────────────────────────── */
const FilterGroup = ({
  label,
  options,
  selected,
  onToggle,
  labelMap,
}: {
  label: string;
  options: string[];
  selected: string;
  onToggle: (value: string) => void;
  labelMap?: Record<string, string>;
}) => (
  <div>
    <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-muted">
      {label}
    </div>
    <div className="flex flex-wrap gap-1.5">
      <button
        onClick={() => onToggle("ANY")}
        className={cn(
          "rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
          selected === "ANY"
            ? "bg-primary text-white shadow-sm"
            : "bg-surface text-text-secondary hover:bg-elevated hover:text-text-primary",
        )}
      >
        All
      </button>
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onToggle(opt)}
          className={cn(
            "rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
            selected === opt
              ? "bg-primary text-white shadow-sm"
              : "bg-surface text-text-secondary hover:bg-elevated hover:text-text-primary",
          )}
        >
          {labelMap?.[opt] ?? opt}
        </button>
      ))}
    </div>
  </div>
);

/* ───── Generic edit modal (custom servers) (unchanged) ─────────────── */

const TRANSPORTS: McpTransport[] = ["STREAMABLE_HTTP", "SSE", "STDIO"];

export const ServerEditModal = ({
  initial,
  onClose,
  onSaved,
  workspaceId,
}: {
  initial?: McpServer;
  onClose: () => void;
  onSaved: () => Promise<void>;
  workspaceId?: string;
}) => {
  const [name, setName] = useState(initial?.name ?? "");
  const [serverUrl, setServerUrl] = useState(initial?.serverUrl ?? "");
  const [transport, setTransport] = useState<McpTransport>(
    initial?.transport ?? "STREAMABLE_HTTP",
  );
  const [headers, setHeaders] = useState<{ key: string; value: string }[]>(
    initial?.authHeaders ?? [],
  );
  const [busy, setBusy] = useState(false);

  const valid = name.trim().length > 0 && serverUrl.trim().length > 0;

  const save = async () => {
    setBusy(true);
    try {
      const body = {
        name,
        serverUrl,
        transport,
        authHeaders: headers.filter((h) => h.key.trim()),
        workspaceId,
      };
      if (initial) await updateServer(initial.id, body);
      else await createServer({ ...body, source: "USER" as any });
      toast.success(initial ? "Server updated" : "Server registered");
      await onSaved();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? e?.message ?? "Save failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      icon={Server}
      title={initial ? `Edit ${initial.name}` : "Register custom MCP server"}
      size="md"
      testId="server-edit-modal"
      footer={
        <>
          <Button
            variant="outline"
            data-testid="server-edit-cancel"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            data-testid="server-edit-save"
            disabled={!valid || busy}
            onClick={save}
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" />
            )}
            {initial ? "Save" : "Register"}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Name *">
          <input
            data-testid="server-edit-name"
            className="h-8 w-full rounded border border-border bg-probestack-bg px-2 text-xs"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label="Server URL *">
          <input
            data-testid="server-edit-url"
            className="h-8 w-full rounded border border-border bg-probestack-bg px-2 font-mono text-xs"
            value={serverUrl}
            onChange={(e) => setServerUrl(e.target.value)}
            placeholder="https://…/mcp"
          />
        </Field>
        <Field label="Transport">
          <select
            data-testid="server-edit-transport"
            value={transport}
            onChange={(e) => setTransport(e.target.value as McpTransport)}
            className="h-8 w-full rounded border border-border bg-probestack-bg px-2 text-xs"
          >
            {TRANSPORTS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Auth headers">
          <div className="space-y-1.5">
            {headers.map((h, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_24px] gap-1.5">
                <input
                  value={h.key}
                  onChange={(e) =>
                    setHeaders(
                      headers.map((x, j) =>
                        j === i ? { ...x, key: e.target.value } : x,
                      ),
                    )
                  }
                  placeholder="Header"
                  className="h-7 rounded border border-border bg-probestack-bg px-2 font-mono text-xs"
                />
                <input
                  value={h.value}
                  onChange={(e) =>
                    setHeaders(
                      headers.map((x, j) =>
                        j === i ? { ...x, value: e.target.value } : x,
                      ),
                    )
                  }
                  placeholder="Value"
                  className="h-7 rounded border border-border bg-probestack-bg px-2 font-mono text-xs"
                />
                <button
                  onClick={() => setHeaders(headers.filter((_, j) => j !== i))}
                  className="flex h-7 w-7 items-center justify-center rounded text-text-muted hover:bg-hover hover:text-danger"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
            <button
              onClick={() => setHeaders([...headers, { key: "", value: "" }])}
              className="text-xs text-primary hover:underline"
            >
              + Add header
            </button>
          </div>
        </Field>
      </div>
    </Modal>
  );
};

const Field = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div>
    <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-muted">
      {label}
    </div>
    {children}
  </div>
);
