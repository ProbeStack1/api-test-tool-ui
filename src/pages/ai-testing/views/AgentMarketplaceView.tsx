/**
 * AgentMarketplaceView — premium catalog with provider carousel (display only)
 * and advanced filter popover (only providers).
 */
import { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Sparkles,
  Bot,
  Search,
  Loader2,
  RotateCw,
  Filter,
  BookmarkPlus,
  Cloud,
  ShieldAlert,
  Activity,
  Coins,
  Globe,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  X,
  Building2,
  Check,
} from "lucide-react";
import { cn } from "@/utils/cn";
import { Tooltip } from "@/components/ui/Tooltip";
import {
  krenexusApi,
  kreBaseUrl,
  type KreAgent,
  type KreDeployedApi,
} from "../../../api/kernexux.api";
import { useWorkspaceStore } from "@/stores/workspace.store";
import {
  apiListCollections,
  apiCreateCollection,
  apiCreateFolder,
  apiGetFolderTree,
} from "@/api/collection.api";
import { apiCreateRequest, apiListRequests } from "@/api/request.api";

/* ────────────────────────── Provider Registry ─────────────────────────── */
const PROVIDER_CONFIG: Record<
  string,
  { label: string; icon: React.ReactNode }
> = {
  kre: { label: "KRE Nexus", icon: <Cloud className="h-5 w-5" /> },
  openai: { label: "OpenAI", icon: <Bot className="h-5 w-5" /> },
  anthropic: { label: "Anthropic", icon: <Bot className="h-5 w-5" /> },
  google: { label: "Google", icon: <Globe className="h-5 w-5" /> },
  typicode: { label: "Typicode", icon: <Building2 className="h-5 w-5" /> },
  "chuck norris api": {
    label: "Chuck Norris",
    icon: <Bot className="h-5 w-5" />,
  },
  "cognition labs": { label: "Cognition", icon: <Bot className="h-5 w-5" /> },
  beeai: { label: "BeeAI", icon: <Bot className="h-5 w-5" /> },
  "built-in": { label: "Built-in", icon: <Bot className="h-5 w-5" /> },
};

const PROTOCOL_LABEL: Record<string, string> = {
  direct: "Direct",
  a2a: "A2A",
  acp: "ACP",
  mcp: "MCP",
};

const PROTOCOL_COLORS: Record<string, string> = {
  direct:
    "bg-orange-100 dark:bg-orange-500/15 text-orange-600 dark:text-orange-300",
  a2a: "bg-purple-100 dark:bg-purple-500/15 text-purple-600 dark:text-purple-300",
  acp: "bg-teal-100   dark:bg-teal-500/15   text-teal-600   dark:text-teal-300",
  mcp: "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
  kre: "bg-indigo-100 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300",
};

/* ────────────────────────── Types ─────────────────────────────────────── */
interface MarketplaceAgent {
  id: string;
  name: string;
  vendor: string;
  protocol: "direct" | "a2a" | "acp" | "mcp" | "kre";
  category: string;
  description: string;
  baseUrl?: string;
  provider?: string;
  model?: string;
  systemPrompt?: string;
  tags?: string[];
  iconColor?: string;
  kreAgentId?: string;
  publicTokenLimit?: number;
  deployedApis?: KreDeployedApi[];
  deploymentUrl?: string;
  kreRaw?: KreAgent;
}

/* ────────────────────────── Stub Data ────────────────────────────────── */
const STARTER_CATALOG: MarketplaceAgent[] = [
  {
    id: "jsonplaceholder",
    name: "JSONPlaceholder API",
    vendor: "Typicode",
    protocol: "direct",
    category: "Data",
    description: "Free fake API for testing and prototyping.",
    baseUrl: "https://jsonplaceholder.typicode.com",
    tags: ["rest", "testing"],
  },
  {
    id: "chucknorris",
    name: "Chuck Norris Jokes",
    vendor: "Chuck Norris API",
    protocol: "direct",
    category: "Fun",
    description: "Get random Chuck Norris jokes – no auth required.",
    baseUrl: "https://api.chucknorris.io",
    tags: ["fun", "jokes"],
  },
  {
    id: "pokemon",
    name: "PokéAPI",
    vendor: "PokéAPI",
    protocol: "direct",
    category: "Data",
    description: "All Pokémon data – abilities, moves, types, evolution.",
    baseUrl: "https://pokeapi.co/api/v2",
    tags: ["pokemon", "games"],
  },
  {
    id: "randomuser",
    name: "Random User Generator",
    vendor: "RandomUser.me",
    protocol: "direct",
    category: "Data",
    description: "Generate random user data for testing.",
    baseUrl: "https://randomuser.me/api",
    tags: ["user", "test-data"],
  },
  {
    id: "gh-deepwiki",
    name: "DeepWiki",
    vendor: "Cognition Labs",
    protocol: "mcp",
    category: "Code Q&A",
    description: "Ask natural-language questions about any public GitHub repo.",
    baseUrl: "https://mcp.deepwiki.com",
    tags: ["code", "rag"],
  },
  {
    id: "gh-search",
    name: "GitHub Search Agent",
    vendor: "Anthropic",
    protocol: "mcp",
    category: "Code Q&A",
    description: "Searches GitHub issues, PRs, code, and discussions.",
    baseUrl: "https://mcp.github.com",
    tags: ["code", "search"],
  },
  {
    id: "researcher",
    name: "Web Researcher",
    vendor: "BeeAI",
    protocol: "acp",
    category: "Research",
    description: "Multi-step web research with citations.",
    baseUrl: "https://beeai.dev/agents/researcher",
    tags: ["web", "research"],
  },
  {
    id: "sql-buddy",
    name: "SQL Buddy",
    vendor: "Google",
    protocol: "a2a",
    category: "Data",
    description:
      "Generates and explains SQL across Postgres / MySQL / BigQuery.",
    baseUrl: "https://a2a.googleapis.com/agents/sql-buddy",
    tags: ["sql", "data"],
  },
  {
    id: "native-react",
    name: "ReAct Math Tutor",
    vendor: "Built-in",
    protocol: "direct",
    category: "Math",
    description: "Step-by-step math tutoring with built-in calculator tool.",
    provider: "openai",
    model: "gpt-4o-mini",
    tags: ["math", "built-in"],
  },
  {
    id: "native-hr",
    name: "HR Buddy",
    vendor: "Built-in",
    protocol: "direct",
    category: "HR",
    description: "Friendly HR Q&A bot — answers policy questions concisely.",
    provider: "google",
    model: "gemini-2.5-flash",
    tags: ["hr", "support"],
  },
];

function mapKreAgent(a: KreAgent): MarketplaceAgent {
  return {
    id: `kre-${a.id}`,
    name: a.name || a.id,
    vendor: a.organization || a.ownerName || "KRE Nexus",
    protocol: "kre",
    category: a.agentType || (a.capabilities?.[0] ?? "AI Agent"),
    description:
      a.description ||
      "KRE Nexus AI agent — chat, run tasks, and inspect deployed APIs.",
    tags: a.tags || a.capabilities?.slice(0, 4),
    kreAgentId: a.id,
    publicTokenLimit: a.publicTokenLimit,
    deployedApis: a.deployedApis,
    kreRaw: a,
  };
}

/* ────────────────────────── Helper: canonical provider key ───────────── */
function getProviderKey(vendor: string): string {
  const raw = vendor.trim();
  const lower = raw.toLowerCase();
  // find exact match in PROVIDER_CONFIG keys (case-insensitive)
  const configKey = Object.keys(PROVIDER_CONFIG).find(
    (k) => k.toLowerCase() === lower,
  );
  return configKey || lower;
}

/* ────────────────────────── Component ─────────────────────────────────── */
export const AgentMarketplaceView = ({
  workspaceId,
}: {
  workspaceId: string;
}) => {
  const nav = useNavigate();
  const wsId = workspaceId || useWorkspaceStore.getState().currentId || "";
  const [kreAgents, setKreAgents] = useState<MarketplaceAgent[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [kreLoadError, setKreLoadError] = useState<string | null>(null);

  // Filters
  const [query, setQuery] = useState("");
  const [proto, setProto] = useState<"all" | "direct" | "a2a" | "acp" | "mcp">(
    "all",
  );
  // Provider filter – stores canonical keys (e.g., 'built-in', 'typicode')
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);

  // Popover state
  const [showFilters, setShowFilters] = useState(false);
  const [providerSearch, setProviderSearch] = useState("");

  const carouselRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  const fetchKreAgents = async () => {
    setLoading(true);
    setKreLoadError(null);
    try {
      const { agents } = await krenexusApi.listAgents();
      setKreAgents(agents.map(mapKreAgent));
    } catch (e: any) {
      setKreLoadError(e?.message || "Failed to reach KRE Nexus marketplace.");
      setKreAgents([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchKreAgents();
  }, []);

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

  const allAgents = useMemo(
    () => [...kreAgents, ...STARTER_CATALOG],
    [kreAgents],
  );

  // Build provider list – unique by canonical key
  const providerList = useMemo(() => {
    const map = new Map<
      string,
      { key: string; label: string; count: number }
    >();
    allAgents.forEach((a) => {
      const key = getProviderKey(a.vendor);
      const existing = map.get(key);
      if (existing) {
        existing.count++;
      } else {
        const config = PROVIDER_CONFIG[key];
        map.set(key, {
          key,
          label: config?.label || a.vendor.trim(),
          count: 1,
        });
      }
    });
    // Sort by label
    return Array.from(map.values()).sort((a, b) =>
      a.label.localeCompare(b.label),
    );
  }, [allAgents]);

  // Filter providers for popover search
  const filteredProviders = useMemo(() => {
    const search = providerSearch.toLowerCase().trim();
    if (!search) return providerList;
    return providerList.filter((p) => p.label.toLowerCase().includes(search));
  }, [providerList, providerSearch]);

  // Main filter logic
  const filtered = allAgents.filter((a) => {
    if (proto !== "all" && a.protocol !== proto) return false;
    if (selectedProviders.length > 0) {
      const agentKey = getProviderKey(a.vendor);
      if (!selectedProviders.includes(agentKey)) return false;
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      if (
        !(
          a.name.toLowerCase().includes(q) ||
          a.vendor.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q) ||
          (a.tags ?? []).some((t) => t.toLowerCase().includes(q))
        )
      )
        return false;
    }
    return true;
  });

  const goToDetail = (a: MarketplaceAgent) => {
    nav(
      `/projects/ai-testing?view=marketplace&id=${encodeURIComponent(a.id)}`,
      {
        state: { agent: a },
      },
    );
  };

  const tryAgent = (a: MarketplaceAgent) => {
    sessionStorage.setItem("forgeq:marketplace:prefill", JSON.stringify(a));
    nav(`/projects/ai-testing?view=agent-testing&proto=${a.protocol}`);
  };

  const saveToCollection = async (a: MarketplaceAgent) => {
    if (a.protocol !== "kre" || !a.kreAgentId) {
      toast.error("Only KRE Nexus agents can be saved.");
      return;
    }
    if (!wsId) {
      toast.error("Select a workspace first.");
      return;
    }
    setSavingId(a.id);
    try {
      const collections = await apiListCollections(wsId);
      let coll = collections.find(
        (c) => c.name.toLowerCase() === "kre nexus agents",
      );
      if (!coll) {
        coll = await apiCreateCollection(wsId, {
          name: "KRE Nexus Agents",
          description: "Saved KRE Nexus AI agents.",
        });
      }
      const tree = await apiGetFolderTree(coll.id).catch(
        () => ({ root: { folders: [] } }) as any,
      );
      const existingFolder = (tree?.root?.folders ?? []).find(
        (f: any) => f?.name === a.name,
      );
      const folder = existingFolder
        ? existingFolder
        : await apiCreateFolder(coll.id, {
            name: a.name,
            description: `${a.vendor} · token limit ${a.publicTokenLimit ?? "unlimited"}`,
          });

      const endpoints =
        a.deployedApis && a.deployedApis.length > 0
          ? a.deployedApis
          : [
              {
                method: "POST",
                path: `/api/proxy/agent-chat/${a.kreAgentId}`,
                url: `${kreBaseUrl()}/api/proxy/agent-chat/${a.kreAgentId}`,
                description: "Chat",
              },
              {
                method: "POST",
                path: `/api/proxy/agent-run/${a.kreAgentId}`,
                url: `${kreBaseUrl()}/api/proxy/agent-run/${a.kreAgentId}`,
                description: "Run Task",
              },
              {
                method: "GET",
                path: `/api/proxy/agent-info/${a.kreAgentId}`,
                url: `${kreBaseUrl()}/api/proxy/agent-info/${a.kreAgentId}`,
                description: "Agent Info",
              },
              {
                method: "GET",
                path: `/api/proxy/agent-status/${a.kreAgentId}`,
                url: `${kreBaseUrl()}/api/proxy/agent-status/${a.kreAgentId}`,
                description: "Agent Status",
              },
            ];

      const existing = await apiListRequests(coll.id, folder.id).catch(
        () => [],
      );
      const existingKeys = new Set(
        existing.map((r: any) => `${r.method}|${r.url?.raw ?? ""}`),
      );

      let created = 0;
      for (const ep of endpoints) {
        const key = `${ep.method}|${ep.url}`;
        if (existingKeys.has(key)) continue;
        const requiresBody = ["POST", "PUT", "PATCH"].includes(ep.method);
        const isChat = /chat/i.test(ep.path);
        const isRun = /run/i.test(ep.path);
        const body = !requiresBody
          ? { mode: "none" as const }
          : isChat
            ? {
                mode: "raw" as const,
                language: "json" as const,
                raw: JSON.stringify(
                  { message: "Hello!", session_id: null },
                  null,
                  2,
                ),
              }
            : isRun
              ? {
                  mode: "raw" as const,
                  language: "json" as const,
                  raw: JSON.stringify(
                    { input: "Describe what you can do." },
                    null,
                    2,
                  ),
                }
              : { mode: "none" as const };
        await apiCreateRequest(
          coll.id,
          {
            collectionId: coll.id,
            folderId: folder.id,
            name: `${ep.description || ep.path} · ${a.name}`,
            method: ep.method,
            url: { raw: ep.url },
            headers: requiresBody
              ? [
                  {
                    key: "Content-Type",
                    value: "application/json",
                    enabled: true,
                  },
                ]
              : [],
            auth: { type: "none" as const },
            body,
            variables: [],
          } as any,
          wsId,
        );
        created++;
      }
      toast.success(
        created > 0
          ? `Saved ${created} endpoints to "${a.name}"`
          : `"${a.name}" already saved`,
        { duration: 3500 },
      );
    } catch (e: any) {
      toast.error("Save failed", { description: e?.message });
    } finally {
      setSavingId(null);
    }
  };

  const scrollCarousel = (dir: "left" | "right") => {
    if (!carouselRef.current) return;
    const scrollAmount = 200;
    carouselRef.current.scrollBy({
      left: dir === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  // Toggle provider selection in popover (using canonical key)
  const toggleProvider = (key: string) => {
    setSelectedProviders((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  // Clear all filters
  const clearAllFilters = () => {
    setQuery("");
    setProto("all");
    setSelectedProviders([]);
    setProviderSearch("");
  };

  // ─── Skeleton ────────────────────────────────────────────────────────
  if (loading && kreAgents.length === 0) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 w-48 animate-pulse rounded bg-hover" />
            <div className="mt-2 h-4 w-64 animate-pulse rounded bg-hover" />
          </div>
          <div className="h-9 w-28 animate-pulse rounded bg-hover" />
        </div>
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-16 w-32 animate-pulse rounded-xl bg-hover shrink-0"
            />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-border bg-surface p-5 shadow-sm"
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
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 p-6" data-testid="ai-testing-marketplace">
      {/* ─── Header ─── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-text-primary">
            Agent Marketplace
          </h2>
          <div className="flex items-center gap-3 text-sm text-text-muted">
            <span>{allAgents.length} agents</span>
            <span className="h-1 w-1 rounded-full bg-text-muted/30" />
            <span>{providerList.length} providers</span>
            {kreAgents.length > 0 && (
              <>
                <span className="h-1 w-1 rounded-full bg-text-muted/30" />
                <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
                  <Activity className="h-3 w-3 animate-pulse" />
                  {kreAgents.length} live KRE
                </span>
              </>
            )}
          </div>
        </div>
        <Tooltip content="Refresh marketplace">
          <button
            onClick={fetchKreAgents}
            disabled={loading}
            className="rounded-lg border border-border bg-surface p-2 text-text-secondary hover:bg-elevated hover:text-text-primary disabled:opacity-50 transition-colors"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RotateCw className="h-4 w-4" />
            )}
          </button>
        </Tooltip>
      </div>

      {/* ─── Error Banner ─── */}
      {kreLoadError && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-sm text-amber-600 dark:text-amber-300">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <div className="font-semibold">KRE Nexus unavailable</div>
            <div>{kreLoadError} Showing starter catalog only.</div>
          </div>
        </div>
      )}

      {/* ─── Provider Carousel (Display Only) ─── */}
      <div className="relative">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 z-1">
          <button
            onClick={() => scrollCarousel("left")}
            className="rounded-full bg-surface/80 border border-border p-1.5 shadow-sm hover:bg-elevated transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>
        <div
          ref={carouselRef}
          className="flex gap-3 overflow-x-auto scroll-smooth px-8 py-2 scrollbar-hide"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {/* All badge – just display */}
          <div className="flex shrink-0 items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5">
            <span className="text-sm font-semibold">Total</span>
            <span className="rounded-full bg-elevated px-1.5 text-xs font-mono">
              {allAgents.length}
            </span>
          </div>
          {providerList.map(({ key, label, count }) => {
            const config = PROVIDER_CONFIG[key];
            return (
              <div
                key={key}
                className="flex shrink-0 items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5"
              >
                <span className="text-lg text-text-secondary">
                  {config?.icon || <Building2 className="h-5 w-5" />}
                </span>
                <span className="text-sm font-medium">{label}</span>
                <span className="rounded-full bg-elevated px-1.5 text-xs font-mono">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
        <div className="absolute right-0 top-1/2 -translate-y-1/2 z-1">
          <button
            onClick={() => scrollCarousel("right")}
            className="rounded-full bg-surface/80 border border-border p-1.5 shadow-sm hover:bg-elevated transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ─── Filter Bar ─── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search agents…"
            className="w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-3 text-sm outline-none focus:border-primary transition-colors"
          />
        </div>

        {/* Protocol pills – without KRE */}
        <div className="flex flex-wrap items-center gap-1">
          {(["all", "direct", "a2a", "acp", "mcp"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setProto(p)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                proto === p
                  ? "bg-primary text-white shadow-sm"
                  : "bg-surface text-text-secondary hover:bg-elevated hover:text-text-primary",
              )}
            >
              {p === "all" ? "All" : (PROTOCOL_LABEL[p] ?? p.toUpperCase())}
            </button>
          ))}
        </div>

        {/* Advanced Filters button */}
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
            {selectedProviders.length > 0 && (
              <span className="rounded-full bg-primary px-1.5 text-xs text-white">
                {selectedProviders.length}
              </span>
            )}
          </button>

          {/* Popover – only providers list */}
          {showFilters && (
            <div className="absolute right-0 top-full mt-2 w-72 rounded-xl border border-border bg-surface p-4 shadow-lg z-20">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold">
                  Filter by Provider
                </span>
                <button
                  onClick={() => setShowFilters(false)}
                  className="text-text-muted hover:text-text-primary"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Search provider */}
              <div className="relative mb-3">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
                <input
                  value={providerSearch}
                  onChange={(e) => setProviderSearch(e.target.value)}
                  placeholder="Search provider…"
                  className="w-full rounded border border-border bg-surface py-1.5 pl-7 pr-2 text-xs outline-none focus:border-primary"
                />
              </div>

              {/* Provider list – max 10 visible, scroll */}
              <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
                {filteredProviders.length === 0 ? (
                  <div className="text-xs text-text-muted py-2">
                    No providers found
                  </div>
                ) : (
                  filteredProviders.map(({ key, label }) => {
                    const config = PROVIDER_CONFIG[key];
                    const selected = selectedProviders.includes(key);
                    return (
                      <button
                        key={key}
                        onClick={() => toggleProvider(key)}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                          selected
                            ? "bg-primary/10 text-primary"
                            : "hover:bg-elevated text-text-secondary",
                        )}
                      >
                        <span className="text-base text-text-secondary">
                          {config?.icon || <Building2 className="h-4 w-4" />}
                        </span>
                        <span className="flex-1 text-left">{label}</span>
                        {selected && <Check className="h-4 w-4 text-primary" />}
                      </button>
                    );
                  })
                )}
              </div>

              <div className="mt-3 flex justify-between">
                <button
                  onClick={() => setSelectedProviders([])}
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
      </div>

      {/* ─── Agent Grid ─── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface p-12 text-center">
          <Filter className="h-10 w-10 text-text-muted opacity-40" />
          <h3 className="mt-3 text-base font-semibold">No agents match</h3>
          <p className="text-sm text-text-muted">
            Try adjusting your search or filters.
          </p>
          <button
            onClick={clearAllFilters}
            className="mt-2 rounded-lg border border-border px-4 py-1.5 text-sm font-medium hover:bg-elevated transition-colors"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((a) => {
            const providerKey = getProviderKey(a.vendor);
            const config = PROVIDER_CONFIG[providerKey];
            const label = config?.label || a.vendor.trim();
            return (
              <div
                key={a.id}
                className="flex h-full flex-col rounded-xl border border-border bg-surface p-4 shadow-sm transition-all hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5"
              >
                <button
                  type="button"
                  onClick={() => goToDetail(a)}
                  className="flex flex-1 flex-col items-start gap-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                >
                  <div className="flex items-start gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-elevated">
                      <Bot className="h-5 w-5 text-text-secondary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-base font-semibold text-text-primary">
                          {a.name}
                        </span>
                        <span
                          className={cn(
                            "rounded-full px-1.5 py-0.5 text-[9px] font-bold",
                            PROTOCOL_COLORS[a.protocol],
                          )}
                        >
                          {PROTOCOL_LABEL[a.protocol] ??
                            a.protocol.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-text-muted">
                        <span>{label}</span>
                        <span>· {a.category}</span>
                      </div>
                    </div>
                  </div>

                  <p className="line-clamp-2 text-sm text-text-secondary flex-1">
                    {a.description}
                  </p>

<div className="flex flex-wrap items-center gap-1.5 mt-1">
  {a.publicTokenLimit != null && (
    <Tooltip content={`Public token limit: ${a.publicTokenLimit.toLocaleString()}`}>
      <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-mono text-indigo-700 dark:text-indigo-300 cursor-help">
        <Coins className="h-3 w-3" /> {a.publicTokenLimit.toLocaleString()}
      </span>
    </Tooltip>
  )}
  {a.deployedApis && a.deployedApis.length > 0 && (
    <Tooltip content={`${a.deployedApis.length} deployed endpoints`}>
      <span className="inline-flex items-center gap-1 rounded-full bg-elevated px-2 py-0.5 text-[10px] font-mono text-text-secondary cursor-help">
        <Globe className="h-3 w-3" /> {a.deployedApis.length}
      </span>
    </Tooltip>
  )}
  {(a.tags ?? []).slice(0, 2).map((t) => (
    <Tooltip key={t} content={`Tag: ${t}`}>
      <span className="rounded-full bg-elevated px-2 py-0.5 text-[10px] font-mono text-text-secondary cursor-help">
        #{t}
      </span>
    </Tooltip>
  ))}
  {(a.tags ?? []).length > 2 && (
    <span className="text-[10px] text-text-muted">+{(a.tags ?? []).length - 2}</span>
  )}
</div>
                </button>

                <div className="mt-4 flex items-center gap-2 shrink-0">
                  <Tooltip content="Quick test in playground">
                    <button
                      onClick={() => tryAgent(a)}
                      className="flex-1 rounded-lg border border-primary/40 bg-primary/5 py-1.5 text-sm font-semibold text-primary hover:bg-primary/10 hover:border-primary/60 transition-colors"
                    >
                      <Sparkles className="inline h-4 w-4 mr-1.5" /> Try
                    </button>
                  </Tooltip>
                  {a.protocol === "kre" && (
                    <Tooltip
                      content={
                        !wsId
                          ? "Select a workspace first"
                          : "Save to collection"
                      }
                    >
                      <button
                        onClick={() => saveToCollection(a)}
                        disabled={savingId === a.id || !wsId}
                        className="rounded-lg border border-border p-2 text-text-secondary hover:bg-elevated hover:text-text-primary transition-colors disabled:opacity-50"
                      >
                        {savingId === a.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <BookmarkPlus className="h-4 w-4" />
                        )}
                      </button>
                    </Tooltip>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
