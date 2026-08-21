/**
 * McpServerDetailView — full-page detail for an MCP server.
 *
 *   • For connected servers (UUID): fetch full details from /mcp/servers.
 *   • For catalog entries (slug): show catalog info with Connect button.
 *   • Tools are fetched via inspect API if the server has the capability.
 *   • Full-width layout.
 */
import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  Server,
  Globe,
  Wrench,
  FileText,
  MessageSquare,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Copy,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Clock,
  Calendar,
  Plug,
  PlugZap,
  Layers,
  Code2,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { cn } from "@/utils/cn";
import { Tooltip } from "@/components/ui/Tooltip";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { MonacoEditor } from "@/components/editor/MonacoEditor";
import { ConnectFromCatalogModal } from "./ConnectFromCatalogModal";
import { ServerEditModal } from "./ServersTab";
import {
  connect,
  listServers,
  listCatalog,
  listTools,
  listResources,
  listPrompts,
  type McpServer,
  type McpCatalogEntry,
} from "@/services/mcp.service";
import { useMcpStudioStore } from "@/stores/mcp-studio.store";
import { useWorkspaceStore } from "@/stores/workspace.store";

interface ServerDetail extends McpServer {
  lastCapabilities?: {
    tools?: { available?: boolean; list_changed?: boolean };
    resources?: {
      available?: boolean;
      list_changed?: boolean;
      subscribe?: boolean;
    };
    prompts?: { available?: boolean; list_changed?: boolean };
    protocol_version?: string;
  };
  lastServerInfo?: {
    name?: string;
    version?: string;
    instructions?: string;
  };
  lastConnectedAt?: string;
  isHealthy?: boolean;
  createdAt?: string;
  updatedAt?: string;
  authHeaders?: Array<{ key: string; value: string }>;
}

// Map snake_case API fields to camelCase
const mapServer = (raw: any): ServerDetail => ({
  ...raw,
  serverUrl: raw.server_url ?? raw.serverUrl,
  isHealthy: raw.is_healthy ?? raw.isHealthy,
  lastConnectedAt: raw.last_connected_at ?? raw.lastConnectedAt,
  createdAt: raw.created_at ?? raw.createdAt,
  updatedAt: raw.updated_at ?? raw.updatedAt,
  authHeaders: raw.auth_headers ?? raw.authHeaders,
  lastCapabilities: raw.last_capabilities ?? raw.lastCapabilities,
  lastServerInfo: raw.last_server_info ?? raw.lastServerInfo,
});

// A tools/resources/prompts call failing with 401/403/"unauthorized" on an
// already-connected server almost always means the configured auth header
// is missing or wrong — surface that plainly instead of a generic error,
// and offer the fix right there instead of making the user hunt for it.
const looksLikeAuthFailure = (msg?: string | null) =>
  !!msg && /\b(401|403|unauthorized|forbidden|authentication)\b/i.test(msg);

export const McpServerDetailView = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { entry?: McpCatalogEntry } | null;

  const wsId = useWorkspaceStore((s) => s.current?.id);
  const setActiveServer = useMcpStudioStore((s) => s.setActiveServer);
  const setTab = useMcpStudioStore((s) => s.setTab);

  // State
  const [server, setServer] = useState<ServerDetail | null>(null);
  const [catalogEntry, setCatalogEntry] = useState<McpCatalogEntry | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);

  // Inspector-driven state
  const [toolsList, setToolsList] = useState<any[]>([]);
  const [toolsLoading, setToolsLoading] = useState(false);
  const [toolsError, setToolsError] = useState<string | null>(null);
  const [resourcesList, setResourcesList] = useState<any[]>([]);
  const [resourcesLoading, setResourcesLoading] = useState(false);
  const [resourcesError, setResourcesError] = useState<string | null>(null);
  const [promptsList, setPromptsList] = useState<any[]>([]);
  const [promptsLoading, setPromptsLoading] = useState(false);
  const [promptsError, setPromptsError] = useState<string | null>(null);
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<
    "overview" | "tools" | "resources" | "prompts"
  >("overview");

  // Opens the real connect form (with an actual auth-header input) instead
  // of the old shortcut that silently sent a hardcoded fake token for any
  // auth-required server.
  const [showConnectModal, setShowConnectModal] = useState(false);
  // "Fix authentication" — opened when an already-connected server's tools/
  // resources/prompts calls come back looking like an auth failure, so the
  // user can correct the header without re-doing the whole connect flow.
  const [showAuthFixModal, setShowAuthFixModal] = useState(false);

  const buildServerRef = (srv: ServerDetail | null) => {
    if (!srv) return null;
    if ((srv as any).isMock || (srv as any).source === "MOCK") {
      return {
        serverUrl: srv.serverUrl,
        transport: srv.transport ?? "STREAMABLE_HTTP",
      };
    }
    return { serverId: srv.id };
  };

  const loadInspectorData = async (srv: ServerDetail) => {
    const ref = buildServerRef(srv);
    if (!ref) return;

    setToolsLoading(true);
    setToolsError(null);
    setResourcesLoading(true);
    setResourcesError(null);
    setPromptsLoading(true);
    setPromptsError(null);
    setToolsList([]);
    setResourcesList([]);
    setPromptsList([]);

    try {
      try {
        await connect(ref as any);
      } catch {
        // Ignore connect errors; the server may already be connected.
      }

      const toolResponse = await listTools(ref as any);
      setToolsList(
        Array.isArray(toolResponse?.tools) ? toolResponse.tools : [],
      );
      if ((toolResponse as any)?.error) {
        setToolsError((toolResponse as any).error);
      }

      const resourceResponse = await listResources(ref as any);
      setResourcesList(
        Array.isArray(resourceResponse?.resources)
          ? resourceResponse.resources
          : [],
      );
      if ((resourceResponse as any)?.error) {
        setResourcesError((resourceResponse as any).error);
      }

      const promptResponse = await listPrompts(ref as any);
      setPromptsList(
        Array.isArray(promptResponse?.prompts) ? promptResponse.prompts : [],
      );
      if ((promptResponse as any)?.error) {
        setPromptsError((promptResponse as any).error);
      }
      const authFailed =
        looksLikeAuthFailure((toolResponse as any)?.error) ||
        looksLikeAuthFailure((resourceResponse as any)?.error) ||
        looksLikeAuthFailure((promptResponse as any)?.error);
      if (authFailed) {
        toast.error("This server needs authentication", {
          description: "The configured auth header is missing or was rejected.",
          action: {
            label: "Fix auth",
            onClick: () => setShowAuthFixModal(true),
          },
        });
      }
    } catch (err: any) {
      const message = err?.message || "Failed to load inspector data";
      if (looksLikeAuthFailure(message)) {
        toast.error("This server needs authentication", {
          description: "The configured auth header is missing or was rejected.",
          action: {
            label: "Fix auth",
            onClick: () => setShowAuthFixModal(true),
          },
        });
      }
      setToolsError(message);
      setResourcesError(message);
      setPromptsError(message);
    } finally {
      setToolsLoading(false);
      setResourcesLoading(false);
      setPromptsLoading(false);
    }
  };

  useEffect(() => {
    if (!slug) return;

    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        slug,
      );

    const loadData = async () => {
      setLoading(true);

      try {
        const servers = await listServers(wsId);

        // 1️⃣ If it's a UUID, try to fetch connected server details
        if (isUuid) {
          const found = servers.find((s) => s.id === slug);
          if (found) {
            const mapped = mapServer(found);
            setServer(mapped);
            setIsConnected(true);
            await loadInspectorData(mapped);
            setLoading(false);
            return;
          }
        }

        // 2️⃣ If we came from a catalog entry, try to match existing server
        const entry = state?.entry;
        if (entry) {
          const matched = servers.find((s) => {
            const sameUrl =
              !!s.serverUrl &&
              !!entry.serverUrl &&
              s.serverUrl === entry.serverUrl;
            const sameName =
              !!s.name &&
              !!entry.name &&
              s.name.toLowerCase() === entry.name.toLowerCase();
            return sameUrl || sameName;
          });

          if (matched) {
            const mapped = mapServer(matched);
            setServer(mapped);
            setIsConnected(true);
            await loadInspectorData(mapped);
            setLoading(false);
            return;
          }

          setCatalogEntry(entry);
          setIsConnected(false);
          setLoading(false);
          return;
        }

        // 3️⃣ Try to fetch catalog by slug
        try {
          const catalog = await listCatalog({});
          const entryFromCatalog = catalog.items.find(
            (item) => item.slug === slug,
          );
          if (entryFromCatalog) {
            setCatalogEntry(entryFromCatalog);
            setIsConnected(false);
            setLoading(false);
            return;
          }
        } catch (err) {
          console.warn("Failed to fetch catalog:", err);
        }
      } catch (err) {
        console.warn("Failed to fetch servers:", err);
      }

      toast.error("Server not found");
      navigate("/projects/mcp");
      setLoading(false);
    };

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, wsId, state?.entry]);

  const toggleTool = (name: string) => {
    setExpandedTools((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const copyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Copy failed");
    }
  };

  const goToInspector = () => {
    if (server) {
      setActiveServer(server.id);
      setTab("inspector");
      navigate("/projects/mcp");
    }
  };

  // Called once ConnectFromCatalogModal has actually connected the server
  // (with the real auth headers the user typed in, not a placeholder).
  const handleConnected = async (s: McpServer) => {
    setShowConnectModal(false);
    const mapped = mapServer(s);
    setServer(mapped);
    setIsConnected(true);
    setCatalogEntry(null);
    setLoading(false);
    navigate(`/projects/mcp/server/${s.id}`, {
      replace: true,
      state: { entry: catalogEntry },
    });
    await loadInspectorData(mapped);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  };

  // Loading skeleton
// Loading skeleton
if (loading) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto p-6 space-y-6">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-8 w-36" />
      </div>

      {/* Hero */}
      <div className="flex items-start gap-5 p-5 rounded-2xl border border-border bg-surface/60 shadow-sm">
        <Skeleton className="h-16 w-16 rounded-lg shrink-0" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-16 rounded-md" />
            <Skeleton className="h-6 w-24 rounded-md" />
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-16 w-full" />
        </div>
      </div>

      {/* Stats Tiles */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>

      {/* Capabilities + URL */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-lg border border-border bg-surface/40">
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-24" />
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-7 w-16 rounded-full" />
            <Skeleton className="h-7 w-20 rounded-full" />
            <Skeleton className="h-7 w-18 rounded-full" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-48 rounded" />
          <Skeleton className="h-8 w-8 rounded" />
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky top-0 z-10 bg-surface border-b border-border">
        <div className="flex gap-2 px-4">
          {['Overview', 'Tools', 'Resources', 'Prompts'].map((label) => (
            <Skeleton key={label} className="h-10 w-20 rounded-t-md" />
          ))}
        </div>
      </div>

      {/* Tab Content – Overview card skeleton */}
      <div className="pt-4 space-y-4">
        <div className="rounded-lg border border-border bg-surface/60 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-16" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-8" />
            </div>
          </div>
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    </div>
  );
}

  if (!server && !catalogEntry) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center overflow-y-auto p-6">
        <Server className="h-12 w-12 text-text-muted opacity-50" />
        <p className="mt-4 text-text-muted">Server not found</p>
        <button
          onClick={() => navigate("/projects/mcp")}
          className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white"
        >
          Back to MCP Studio
        </button>
      </div>
    );
  }

// ---- Connected server view ----
if (server && isConnected) {
  const {
    name,
    description,
    serverUrl,
    transport,
    isHealthy,
    lastConnectedAt,
    createdAt,
    updatedAt,
    authHeaders,
    lastCapabilities,
    lastServerInfo,
  } = server;

  const hasTools = Boolean(
    lastCapabilities?.tools?.available || toolsList.length > 0 || toolsError,
  );
  const hasResources = Boolean(
    lastCapabilities?.resources?.available ||
      resourcesList.length > 0 ||
      resourcesError,
  );
  const hasPrompts = Boolean(
    lastCapabilities?.prompts?.available ||
      promptsList.length > 0 ||
      promptsError,
  );
  const protocolVersion = lastCapabilities?.protocol_version;
  const createdValue = createdAt
    ? formatDate(createdAt)
    : lastConnectedAt
      ? formatDate(lastConnectedAt)
      : "Not available";
  const updatedValue = updatedAt
    ? formatDate(updatedAt)
    : lastConnectedAt
      ? formatDate(lastConnectedAt)
      : "Not available";
  const tabMeta = [
    {
      key: "overview" as const,
      label: "Overview",
      tooltip: "Server summary and connection details",
    },
    {
      key: "tools" as const,
      label: "Tools",
      tooltip: "Functions exposed by this MCP server",
    },
    {
      key: "resources" as const,
      label: "Resources",
      tooltip: "Data or file resources available from the server",
    },
    {
      key: "prompts" as const,
      label: "Prompts",
      tooltip: "Reusable prompt templates exposed by the server",
    },
  ];

  return (
    <div
      className="flex h-full min-h-0 flex-col overflow-y-auto p-6 space-y-6"
      data-testid="mcp-server-detail-connected"
    >
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          onClick={() => navigate("/projects/mcp")}
          className="inline-flex items-center gap-2 text-sm font-medium text-text-muted hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to MCP Studio
        </button>
        <div className="flex items-center gap-2">
          <Tooltip content="Open this server in the Inspector">
            <button
              onClick={goToInspector}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all hover:scale-[1.02]"
            >
              <PlugZap className="h-4 w-4" /> Open in Inspector
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Hero */}
      <div className="flex items-start gap-5 p-5 rounded-2xl bg-gradient-to-br from-surface via-elevated to-surface border border-border shadow-sm">
        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 text-3xl shadow-inner">
          <Globe className="h-8 w-8 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="truncate text-2xl font-bold text-text-primary">
              {name}
            </h1>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-xs font-semibold uppercase border",
                isHealthy
                  ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30"
                  : "bg-danger/15 text-danger border-danger/30",
              )}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full bg-current",
                  isHealthy ? "bg-emerald-500" : "bg-danger",
                )}
              />
              {isHealthy ? "Healthy" : "Unhealthy"}
            </span>
            {lastServerInfo?.version && (
              <span className="rounded-md bg-elevated px-2 py-0.5 font-mono text-xs font-semibold text-text-muted border border-border">
                v{lastServerInfo.version}
              </span>
            )}
            <span className="rounded-md bg-elevated px-2 py-0.5 font-mono text-xs font-semibold text-text-muted border border-border">
              {transport}
            </span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-text-muted">
            <span className="flex items-center gap-1 truncate max-w-md">
              <Server className="h-3 w-3 shrink-0" /> {serverUrl}
            </span>
            {protocolVersion && (
              <span className="flex items-center gap-1">
                <Layers className="h-3 w-3" /> Protocol: {protocolVersion}
              </span>
            )}
          </div>
          {description && (
            <div className="relative mt-2 text-sm leading-relaxed text-text-secondary">
              <p className="whitespace-pre-line">{description}</p>
            </div>
          )}
          {authHeaders && authHeaders.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                Auth:
              </span>
              {authHeaders.map((h, i) => (
                <span
                  key={i}
                  className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-mono text-amber-600 dark:text-amber-300"
                >
                  {h.key}: ••••••••
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stats Tiles */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        <TileWithTooltip
          icon={Activity}
          label="Status"
          value={isHealthy ? "Healthy" : "Unhealthy"}
          valueColor={isHealthy ? "text-emerald-600" : "text-danger"}
        />
        <TileWithTooltip
          icon={Plug}
          label="Transport"
          value={transport || "—"}
        />
        <TileWithTooltip
          icon={Clock}
          label="Last Connected"
          value={
            lastConnectedAt ? formatDate(lastConnectedAt) : "Not available"
          }
        />
        <TileWithTooltip
          icon={Calendar}
          label="Created"
          value={createdValue}
        />
        <TileWithTooltip
          icon={Calendar}
          label="Updated"
          value={updatedValue}
        />
      </div>

      {/* Capabilities + URL (unchanged) */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-lg border border-border bg-surface/40">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-1.5">
            Capabilities
          </h3>
          <div className="flex flex-wrap gap-2">
            <CapabilityBadge
              label="Tools"
              available={hasTools}
              icon={<Wrench className="h-3 w-3" />}
              tooltip="Server provides tools (functions) that can be called."
            />
            <CapabilityBadge
              label="Resources"
              available={hasResources}
              icon={<FileText className="h-3 w-3" />}
              tooltip="Server exposes resources (data/files) that can be read."
            />
            <CapabilityBadge
              label="Prompts"
              available={hasPrompts}
              icon={<MessageSquare className="h-3 w-3" />}
              tooltip="Server offers predefined prompts for chat interactions."
            />
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Tooltip content={`Server URL: ${serverUrl}`}>
            <div className="flex items-center gap-2 rounded border border-border/60 bg-elevated/70 px-2 py-1">
              <code className="truncate max-w-[220px] text-xs text-text-secondary font-mono">
                {serverUrl}
              </code>
            </div>
          </Tooltip>
          <Tooltip content="Open this MCP server URL in a new tab">
            <a
              href={serverUrl}
              target="_blank"
              rel="noreferrer"
              className="grid h-8 w-8 place-items-center rounded border border-border bg-surface hover:bg-elevated transition-colors"
            >
              <ExternalLink className="h-4 w-4 text-text-muted hover:text-primary" />
            </a>
          </Tooltip>
        </div>
      </div>

      {/* Sticky Tabs */}
      <div className="sticky top-0 z-10 bg-surface border-b border-border mb-1">
        <div className="flex gap-2 px-4">
          {tabMeta.map((tab) => (
            <Tooltip key={tab.key} content={tab.tooltip}>
              <button
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "px-4 py-2 text-sm font-semibold border-b-2 transition-colors",
                  activeTab === tab.key
                    ? "border-primary text-primary"
                    : "border-transparent text-text-muted hover:text-text-primary",
                )}
              >
                {tab.label}
                {tab.key === "tools" && toolsList.length > 0 && (
                  <span className="ml-1.5 rounded-full bg-elevated px-1.5 text-xs font-mono">
                    {toolsList.length}
                  </span>
                )}
              </button>
            </Tooltip>
          ))}
        </div>
      </div>

      {/* Tab Content – scrollable */}
      <div className="pt-4">
        {/* Overview tab */}
{activeTab === "overview" && (
  <div className="space-y-4">
    {/* Combined card: Name, Version, URL, Instructions */}
    <div className="rounded-lg border border-border bg-surface/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3 text-sm">
          {lastServerInfo?.name && (
            <span className="font-semibold">{lastServerInfo.name}</span>
          )}
          {lastServerInfo?.version && (
            <span className="font-mono">v{lastServerInfo.version}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <code className="truncate rounded bg-elevated px-3 py-1 font-mono text-sm text-text-primary border border-border/50 max-w-xs md:max-w-md">
            {serverUrl}
          </code>
          <button
            onClick={() => copyText(serverUrl, "URL")}
            className="grid h-8 w-8 place-items-center rounded-md border border-border bg-surface hover:bg-elevated transition-colors"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
          <a
            href={serverUrl}
            target="_blank"
            rel="noreferrer"
            className="grid h-8 w-8 place-items-center rounded-md border border-border bg-surface hover:bg-elevated transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
      {lastServerInfo?.instructions && (
        <div className="mt-3 text-sm text-text-secondary whitespace-pre-wrap">
          {lastServerInfo.instructions}
        </div>
      )}
    </div>

    {/* Auth Headers card (only if present) */}
    {authHeaders && authHeaders.length > 0 && (
      <div className="rounded-lg border border-border bg-surface/60 p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-text-muted">Auth Headers</span>
          <button
            onClick={() => setShowAuthFixModal(true)}
            className="text-xs font-medium text-primary hover:underline"
          >
            Edit
          </button>
        </div>
        <div className="mt-2 space-y-1">
          {authHeaders.map((h, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <code className="rounded bg-elevated px-2 py-0.5 font-mono">{h.key}</code>
              <span className="text-text-muted">:</span>
              <code className="rounded bg-elevated px-2 py-0.5 font-mono text-text-secondary">{h.value}</code>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
)}

        {/* Tools tab */}
        {activeTab === "tools" && (
          <div className="space-y-3">
            {toolsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading tools…
              </div>
            ) : toolsError ? (
              <div className="rounded-lg border border-danger/40 bg-danger/5 p-4 text-sm text-danger">
                <AlertTriangle className="inline h-4 w-4 mr-1.5" />
                {toolsError}
              </div>
            ) : toolsList.length === 0 ? (
              <div className="rounded-lg border h-50 border-dashed border-border bg-surface/20 flex flex-col items-center justify-center text-center text-sm">
                <Wrench className="h-8 w-8 opacity-30" />
                <p className="mt-2">No tools available for this server.</p>
              </div>
            ) : (
              toolsList.map((tool) => {
                const isExpanded = expandedTools.has(tool.name);
                return (
                  <div
                    key={tool.name}
                    className="rounded-lg border border-border bg-surface/40 overflow-hidden"
                  >
                    <button
                      onClick={() => toggleTool(tool.name)}
                      className="flex w-full items-center gap-2 px-4 py-3 text-left bg-surface hover:bg-hover transition-colors"
                    >
                      <span className="text-text-muted">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </span>
                      <Wrench className="h-4 w-4 text-primary" />
                      <span className="font-mono text-md font-semibold">
                        {tool.name}
                      </span>
                      {tool.inputSchema?.required &&
                        Array.isArray(tool.inputSchema.required) && (
                          <span className="rounded px-1.5 py-0.5 text-xs font-semibold text-amber-500 dark:text-amber-300">
                            required: {tool.inputSchema.required.join(", ")}
                          </span>
                        )}
                    </button>
                    {isExpanded && (
                      <div className="border-t border-border p-4 space-y-3 bg-surface">
                        {tool.description && (
                          <div>
                            <p className="mt-0.5 text-sm text-text-secondary">
                              {tool.description}
                            </p>
                          </div>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {tool.inputSchema && (
                            <div>
                              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
                                <Code2 className="h-3 w-3" /> Input Schema
                              </div>
                              <div className="mt-1 h-150 overflow-hidden rounded border border-border/60">
                                <MonacoEditor
                                  value={JSON.stringify(
                                    tool.inputSchema,
                                    null,
                                    2,
                                  )}
                                  onChange={() => {}}
                                  language="json"
                                  readOnly
                                  testId={`tool-schema-${tool.name}`}
                                />
                              </div>
                            </div>
                          )}
                          {tool.outputSchema && (
                            <div>
                              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
                                <Code2 className="h-3 w-3" /> Output Schema
                              </div>
                              <div className="mt-1 h-150 overflow-hidden rounded border border-border/60">
                                <MonacoEditor
                                  value={JSON.stringify(
                                    tool.outputSchema,
                                    null,
                                    2,
                                  )}
                                  onChange={() => {}}
                                  language="json"
                                  readOnly
                                  testId={`tool-output-${tool.name}`}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Resources tab */}
        {activeTab === "resources" && (
          <div className="space-y-3">
            {resourcesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading resources…
              </div>
            ) : resourcesError ? (
              <div className="rounded-lg border border-danger/40 bg-danger/5 p-4 text-sm text-danger">
                <AlertTriangle className="inline h-4 w-4 mr-1.5" />
                {resourcesError}
              </div>
            ) : resourcesList.length === 0 ? (
              <div className="rounded-lg border h-50 border-dashed border-border bg-surface/20 flex flex-col items-center justify-center text-center text-sm">
                <FileText className="h-8 w-8 opacity-30" />
                <p className="mt-2">This server does not expose resources.</p>
              </div>
            ) : (
              resourcesList.map((resource) => (
                <div
                  key={resource.uri}
                  className="rounded-lg border border-border bg-surface/40 p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="font-mono text-sm font-semibold text-text-primary">
                        {resource.name || resource.uri}
                      </div>
                      {resource.description && (
                        <p className="mt-1 text-sm text-text-secondary">
                          {resource.description}
                        </p>
                      )}
                    </div>
                    {resource.mimeType && (
                      <span className="rounded bg-elevated px-2 py-0.5 text-[11px] font-mono">
                        {resource.mimeType}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 truncate font-mono text-xs">
                    {resource.uri}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Prompts tab */}
        {activeTab === "prompts" && (
          <div className="space-y-3">
            {promptsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading prompts…
              </div>
            ) : promptsError ? (
              <div className="rounded-lg border border-danger/40 bg-danger/5 p-4 text-sm text-danger">
                <AlertTriangle className="inline h-4 w-4 mr-1.5" />
                {promptsError}
              </div>
            ) : promptsList.length === 0 ? (
              <div className="rounded-lg border h-50 border-dashed border-border bg-surface/20 flex flex-col items-center justify-center text-center text-sm">
                <MessageSquare className="h-8 w-8 opacity-30" />
                <p className="mt-2">This server does not expose prompts.</p>
              </div>
            ) : (
              promptsList.map((prompt) => (
                <div
                  key={prompt.name}
                  className="rounded-lg border border-border bg-surface/40 p-4"
                >
                  <div className="font-mono text-sm font-semibold text-text-primary">
                    {prompt.name}
                  </div>
                  {prompt.description && (
                    <p className="mt-1 text-sm text-text-secondary">
                      {prompt.description}
                    </p>
                  )}
                  {prompt.arguments && prompt.arguments.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {prompt.arguments.map((arg: any) => (
                        <span
                          key={arg.name}
                          className="rounded bg-elevated px-2 py-0.5 text-[11px] font-mono"
                        >
                          {arg.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {showAuthFixModal && (
        <ServerEditModal
          initial={server}
          workspaceId={wsId}
          onClose={() => setShowAuthFixModal(false)}
          onSaved={async () => {
            setShowAuthFixModal(false);
            const servers = await listServers(wsId);
            const refreshed = servers.find((s) => s.id === server.id);
            if (refreshed) {
              const mapped = mapServer(refreshed);
              setServer(mapped);
              await loadInspectorData(mapped);
            }
          }}
        />
      )}
    </div>
  );
}

  // ---- Not connected – show catalog entry with Connect button ----
  if (catalogEntry && !isConnected) {
    const entry = catalogEntry;
    const isStdio = entry.transport === "STDIO";

    return (
      <div
        className="flex h-full min-h-0 flex-col overflow-y-auto p-6 space-y-6"
        data-testid="mcp-server-detail-catalog"
      >
        {/* Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <button
            onClick={() => navigate("/projects/mcp")}
            className="inline-flex items-center gap-2 text-sm font-medium text-text-muted hover:text-text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to MCP Studio
          </button>
          <div className="flex items-center gap-2">
            {isStdio ? (
              <Tooltip content="STDIO servers can't be connected from the web UI. Use the Claude Desktop config instead.">
                <span className="inline-flex items-center gap-1.5 rounded-md border border-warning/40 bg-warning/5 px-4 py-2 text-sm font-semibold text-warning">
                  <AlertTriangle className="h-4 w-4" /> STDIO – local only
                </span>
              </Tooltip>
            ) : (
              <Button
                variant="primary"
                onClick={() => setShowConnectModal(true)}
                className="inline-flex items-center gap-1.5"
              >
                <Sparkles className="h-4 w-4" />
                {entry.requiresAuth ? "Request Access" : "Connect Server"}
              </Button>
            )}
          </div>
        </div>

        {/* Hero */}
        <div className="flex items-start gap-5 p-5 rounded-2xl bg-gradient-to-br from-surface via-elevated to-surface border border-border shadow-sm">
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 text-3xl shadow-inner">
            <Globe className="h-8 w-8 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="truncate text-2xl font-bold text-text-primary">
                {entry.name}
              </h1>
              {entry.official && (
                <Tooltip content="Official — vendor-maintained">
                  <ShieldCheck className="h-5 w-5 text-success" />
                </Tooltip>
              )}
              {entry.requiresAuth && (
                <Tooltip content="Requires authentication">
                  <ShieldAlert className="h-5 w-5 text-warning" />
                </Tooltip>
              )}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-text-muted">
              <span className="flex items-center gap-1">
                <Server className="h-3 w-3" /> {entry.transport}
              </span>
              <span className="flex items-center gap-1">
                <Layers className="h-3 w-3" /> {entry.category}
              </span>
              {entry.license && <span>· {entry.license}</span>}
              {entry.pricing && <span>· {entry.pricing}</span>}
            </div>
            <div className="relative mt-2 text-sm leading-relaxed text-text-secondary">
              <p className="whitespace-pre-line">{entry.description}</p>
            </div>
            {(entry.tags ?? []).length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {(entry.tags ?? []).map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-elevated px-2 py-0.5 text-xs font-mono text-text-secondary"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Stats Tiles */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          <TileWithTooltip
            icon={Plug}
            label="Transport"
            value={entry.transport || "—"}
          />
          <TileWithTooltip
            icon={Layers}
            label="Category"
            value={entry.category || "—"}
          />
          <TileWithTooltip
            icon={ShieldCheck}
            label="License"
            value={entry.license || "—"}
          />
          <TileWithTooltip
            icon={CheckCircle2}
            label="Pricing"
            value={entry.pricing || "—"}
          />
          <TileWithTooltip
            icon={Activity}
            label="Visibility"
            value={entry.visibility || "—"}
          />
        </div>

        {/* Homepage */}
        {entry.homepage && (
          <div className="rounded-lg border border-border bg-surface/60 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-medium text-text-muted">
                Homepage
              </span>
              <a
                href={entry.homepage}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-sm font-semibold hover:bg-elevated transition-colors"
              >
                <ExternalLink className="h-4 w-4" /> Visit
              </a>
            </div>
          </div>
        )}

        {/* Auth info */}
        {entry.requiresAuth && entry.authHelp && (
          <div className="rounded-lg border border-warning/40 bg-warning/5 p-4 text-sm text-warning">
            <ShieldAlert className="inline h-4 w-4 mr-1.5" />
            <strong>Auth required:</strong> {entry.authHelp}
          </div>
        )}

        {showConnectModal && (
          <ConnectFromCatalogModal
            entry={entry}
            workspaceId={wsId}
            onClose={() => setShowConnectModal(false)}
            onConnected={handleConnected}
          />
        )}
      </div>
    );
  }

  return null;
};

/* ─── Sub-components ──────────────────────────────────────────────────── */

const TileWithTooltip = ({
  icon: Icon,
  label,
  value,
  valueColor,
}: {
  icon: any;
  label: string;
  value: any;
  valueColor?: string;
}) => {
  const showTooltip = typeof value === "string" && value.length > 20;
  const displayValue = showTooltip ? value.slice(0, 20) + "…" : value;
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-surface/60 p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-text-muted">
          {label}
        </div>
        {showTooltip ? (
          <Tooltip content={value} side="bottom">
            <div
              className={cn(
                "truncate text-sm font-semibold text-text-primary",
                valueColor,
              )}
            >
              {displayValue}
            </div>
          </Tooltip>
        ) : (
          <div
            className={cn(
              "truncate text-sm font-semibold text-text-primary",
              valueColor,
            )}
          >
            {value}
          </div>
        )}
      </div>
    </div>
  );
};

const CapabilityBadge = ({
  label,
  available,
  icon,
  tooltip,
}: {
  label: string;
  available?: boolean;
  icon: React.ReactNode;
  tooltip: string;
}) => (
  <Tooltip content={tooltip}>
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border cursor-help",
        available
          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/20"
          : "bg-text-muted/5 text-text-muted border-border",
      )}
    >
      {icon}
      {label}
      {available !== undefined && (
        <span
          className={cn(
            "ml-0.5 h-1.5 w-1.5 rounded-full",
            available ? "bg-emerald-500" : "bg-text-muted/30",
          )}
        />
      )}
    </span>
  </Tooltip>
);
