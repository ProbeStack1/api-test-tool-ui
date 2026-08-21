/**
 * AgentDetailView — full-page detail view for a single agent.
 *
 *   • Uses state from marketplace (vendor, framework, baseUrl for stub agents).
 *   • For KRE agents: fetches proxy to get deployment, endpoints, token limit, updated_at.
 *   • For stub agents (non-KRE): uses state data only – no extra API calls.
 *   • Header shows: name, status, version, vendor, framework (with tooltip).
 *   • Tiles: Deployment, Service, Region, Token Limit, Version, Updated At.
 *   • Chat messages formatted with bold headers, numbered/bullet lists.
 *   • Execution Stats: Status, Latency, Cost, Tokens (removed Model/Provider).
 *   • Non‑KRE agents show a message instead of sending chat requests.
 */
import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  Bot,
  Copy,
  ExternalLink,
  Loader2,
  Sparkles,
  ShieldAlert,
  Tag as TagIcon,
  Wrench,
  Cpu,
  Zap,
  Boxes,
  Globe,
  ServerCog,
  Hash,
  Clock,
  User,
  Building2,
  Send,
  MessageSquare,
  Activity,
  Cloud,
  CheckCircle2,
  AlertTriangle,
  Coins,
  Layers,
  GitBranch,
  Award,
  RotateCw,
  Check,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/utils/cn";
import {
  krenexusApi,
  kreBaseUrl,
  type KreDeployedApi,
} from "../../../api/kernexux.api";
import { deployedApiToCurl } from "@/utils/agentToCollection";
import { ExecutionTrace } from "./ExecutionTrace";
import { Tooltip } from "@/components/ui/Tooltip";

// ─── Types ───────────────────────────────────────────────────────────────

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
  kreRaw?: any;
}

interface MarketplaceAgentDetail {
  id: string;
  name: string;
  description: string;
  version: string;
  status: string;
  deploymentStage: string;
  createdAt: string;
  updatedAt: string;
  createdByEmail: string;
  creatorName?: string;
  vendor?: string;
  framework: string;
  capabilities: string[];
  tools: string[];
  endpoints: Array<{ method: string; path: string; description?: string }>;
  deployedApis: KreDeployedApi[];
  deploymentInfo: {
    url: string;
    status: string;
    serviceName: string;
    region: string;
    deploymentId?: string;
  };
  public_token_limit?: number;
  agentConfig?: any;
  chatHistory?: Array<{ role: string; content: string }>;
  llmSampleOutput?: any;
  modelName?: string;
  provider?: string;
  protocol?: string;
}

// ─── Helper: format assistant messages with bold & lists ──────────────

function formatAssistantMessage(text: any): React.ReactNode {
  if (text === null || text === undefined) return null;
  if (typeof text !== "string") {
    try { text = JSON.stringify(text); } catch { return null; }
  }

  const paragraphs = text.split(/\n\s*\n/).filter((p: string) => p.trim());

  return paragraphs.map((para: string, idx: number) => {
    const lines = para.split("\n");
    const isList = lines.some((line: string) => /^(\d+\.|\*|\-)\s/.test(line.trim()));

    if (isList) {
      const items = lines.map((line: string, i: number) => {
        const trimmed = line.trim();
        const content = trimmed.replace(/^(\d+\.|\*|\-)\s*/, "").trim();
        const boldMatch = content.match(/^\*\*(.*?)\*\*\s*[:：]\s*(.*)/);
        if (boldMatch) {
          const heading = boldMatch[1];
          const detail = boldMatch[2] || "";
          return (
            <li key={i} className="mb-1 text-sm leading-relaxed">
              <span className="font-bold text-text-primary">{heading}:</span>
              <span className="text-text-secondary ml-1">{detail}</span>
            </li>
          );
        }
        return (
          <li key={i} className="mb-1 text-sm leading-relaxed text-text-secondary">
            {content}
          </li>
        );
      });
      const isOrdered = /^\d+\./.test(lines[0]?.trim() || "");
      const ListComponent = isOrdered ? "ol" : "ul";
      return (
        <ListComponent key={idx} className={cn("pl-4 space-y-0.5", isOrdered ? "list-decimal" : "list-disc")}>
          {items}
        </ListComponent>
      );
    }

    const parts = para.split(/(\*\*[^*]+\*\*)/);
    const rendered = parts.map((part: string, i: number) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i} className="font-bold text-text-primary">{part.slice(2, -2)}</strong>;
      }
      return <span key={i} className="text-text-secondary">{part}</span>;
    });

    return (
      <p key={idx} className="text-sm leading-relaxed text-text-secondary whitespace-pre-wrap mb-2 last:mb-0">
        {rendered}
      </p>
    );
  });
}

// ─── Component ───────────────────────────────────────────────────────────

export const AgentDetailView = ({
  workspaceId,
  agentId,
}: {
  workspaceId: string;
  agentId: string;
}) => {
  const nav = useNavigate();
  const location = useLocation();
  const state = location.state as { agent?: MarketplaceAgent } | null;

  const realId = agentId.startsWith("kre-") ? agentId.slice(4) : agentId;

  const isKreAgent = state?.agent?.protocol === "kre";

  // ─── Build from state (initial) ──────────────────────────────────────

  function buildAgentFromState(
    stateAgent: MarketplaceAgent,
  ): MarketplaceAgentDetail {
    const raw = stateAgent.kreRaw || {};
    const config = raw.agentConfig || {};
    const llm = config.llm || {};
    // For stub agents, use baseUrl if provided
    const deploymentUrl = stateAgent.baseUrl || raw.deployment_url || "";
    return {
      id: realId,
      name: stateAgent.name || raw.name || "Unnamed Agent",
      description: stateAgent.description || raw.description || "",
      version: raw.version || "1.0.0",
      status: raw.status || "deployed",
      deploymentStage: raw.deploymentStage || "production",
      createdAt: raw.createdAt || raw.created_at || new Date().toISOString(),
      updatedAt: raw.updatedAt || raw.updated_at || new Date().toISOString(),
      createdByEmail: raw.createdByEmail || raw.created_by_email || "unknown",
      creatorName:
        stateAgent.vendor || raw.creatorName || raw.createdByEmail || "unknown",
      vendor: stateAgent.vendor,
      framework: raw.framework || "unknown",
      capabilities: raw.capabilities || [],
      tools: raw.tools || [],
      endpoints: raw.endpoints || [],
      deployedApis: stateAgent.deployedApis || raw.deployedApis || [],
      deploymentInfo: raw.deploymentInfo || {
        url: deploymentUrl,
        status: "deployed",
        serviceName: "",
        region: "us-central1",
      },
      public_token_limit:
        raw.public_token_limit ??
        raw.publicTokenLimit ??
        stateAgent.publicTokenLimit,
      agentConfig: config,
      chatHistory: raw.chatHistory || [],
      modelName: "unknown",
      provider: "unknown",
      protocol: stateAgent.protocol,
    };
  }

  // ─── Build proxy fields ─────────────────────────────────────────────────

  function buildProxyFields(proxy: any): Partial<MarketplaceAgentDetail> {
    return {
      deploymentInfo: proxy.deploymentInfo || {
        url: proxy.deployment_url || "",
        status: "deployed",
        serviceName: "",
        region: "us-central1",
      },
      deployedApis: proxy.deployedApis || [],
      endpoints: proxy.endpoints || [],
      capabilities: proxy.capabilities || [],
      tools: proxy.tools || [],
      public_token_limit: proxy.public_token_limit ?? proxy.publicTokenLimit,
      status: proxy.status || "deployed",
      version: proxy.version || "1.0.0",
      createdAt: proxy.created_at ?? new Date().toISOString(),
      updatedAt: proxy.updated_at ?? proxy.created_at ?? new Date().toISOString(),
      createdByEmail: proxy.created_by_email || "unknown",
      creatorName: proxy.creatorName || proxy.created_by_email || "unknown",
    };
  }

  // ─── State ──────────────────────────────────────────────────────────────

  const [loading, setLoading] = useState(!state?.agent);
  const [agent, setAgent] = useState<MarketplaceAgentDetail | null>(
    state?.agent ? buildAgentFromState(state.agent) : null,
  );
  const [lastSynced, setLastSynced] = useState<Date | null>(
    state?.agent ? new Date() : null,
  );

  // Chat state
  const [action, setAction] = useState<"chat" | "run" | "status">("chat");
  const [message, setMessage] = useState("Hello! What can you help me with?");
  const [sessionId, setSessionId] = useState("");
  const [chatMessages, setChatMessages] = useState<
    Array<{ role: "user" | "assistant"; content: string }>
  >([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [tokenUsage, setTokenUsage] = useState<{
    used: number;
    limit: number;
  } | null>(null);
  const [lastResult, setLastResult] = useState<any>(null);
  const [lastCost, setLastCost] = useState<number>(0);
  const [lastLatency, setLastLatency] = useState<number>(0);
  const [lastTokens, setLastTokens] = useState<number>(0);
  const [lastStatus, setLastStatus] = useState<string>("");
  const [expandedDesc, setExpandedDesc] = useState(false);

  const [copiedIndex, setCopiedIndex] = useState<{ [key: number]: boolean }>(
    {},
  );

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const descContainerRef = useRef<HTMLDivElement>(null);

  // ─── Fetch proxy and merge (only for KRE agents) ──────────────────────

  const fetchProxyAndMerge = async () => {
    if (!isKreAgent) {
      setLoading(false);
      return;
    }
    try {
      const resp = await krenexusApi.getAgentInfo(realId);
      const proxy = (resp as any)?.body || resp;
      if (proxy) {
        const proxyFields = buildProxyFields(proxy);
        setAgent((prev) => {
          if (!prev) {
            return {
              id: realId,
              name: proxy.name || "Unnamed Agent",
              description: proxy.description || "",
              version: proxyFields.version || "1.0.0",
              status: proxyFields.status || "deployed",
              deploymentStage: "production",
              createdAt: proxyFields.createdAt || new Date().toISOString(),
              updatedAt: proxyFields.updatedAt || new Date().toISOString(),
              createdByEmail: proxyFields.createdByEmail || "unknown",
              creatorName: proxyFields.creatorName || "unknown",
              vendor: undefined,
              framework: "unknown",
              capabilities: proxyFields.capabilities || [],
              tools: proxyFields.tools || [],
              endpoints: proxyFields.endpoints || [],
              deployedApis: proxyFields.deployedApis || [],
              deploymentInfo: proxyFields.deploymentInfo || {
                url: "",
                status: "deployed",
                serviceName: "",
                region: "us-central1",
              },
              public_token_limit: proxyFields.public_token_limit,
              agentConfig: {},
              chatHistory: [],
              modelName: "unknown",
              provider: "unknown",
              protocol: "kre",
            };
          }
          return {
            ...prev,
            deploymentInfo: proxyFields.deploymentInfo || prev.deploymentInfo,
            deployedApis:
              proxyFields.deployedApis && proxyFields.deployedApis.length > 0
                ? proxyFields.deployedApis
                : prev.deployedApis,
            endpoints:
              proxyFields.endpoints && proxyFields.endpoints.length > 0
                ? proxyFields.endpoints
                : prev.endpoints,
            capabilities:
              proxyFields.capabilities && proxyFields.capabilities.length > 0
                ? proxyFields.capabilities
                : prev.capabilities,
            tools:
              proxyFields.tools && proxyFields.tools.length > 0
                ? proxyFields.tools
                : prev.tools,
            public_token_limit:
              proxyFields.public_token_limit ?? prev.public_token_limit,
            status: proxyFields.status || prev.status,
            version: proxyFields.version || prev.version,
            createdAt: proxyFields.createdAt || prev.createdAt,
            updatedAt: proxyFields.updatedAt || prev.updatedAt,
            createdByEmail: proxyFields.createdByEmail || prev.createdByEmail,
            creatorName: proxyFields.creatorName || prev.creatorName,
            vendor: prev.vendor,
            framework: prev.framework,
            protocol: prev.protocol,
          };
        });
        setLastSynced(new Date());
        if (proxyFields.public_token_limit) {
          setTokenUsage({ used: 0, limit: proxyFields.public_token_limit });
        }
        setLoading(false);
      } else {
        toast.error("No data from proxy");
        setLoading(false);
      }
    } catch (error: any) {
      console.error("[AgentDetail] Proxy fetch failed:", error);
      toast.error("Failed to load agent details from proxy");
      setLoading(false);
    }
  };

  // ─── Effect ────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchProxyAndMerge();
    // eslint-disable-next-line
  }, [agentId, isKreAgent]);

  // ─── Helpers ──────────────────────────────────────────────────────────

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Copy failed");
    }
  };

  const tryAgent = () => {
    if (!agent) return;
    const prefill = {
      id: agent.id,
      name: agent.name,
      protocol: agent.protocol || "kre",
      provider: agent.provider || "google",
      model: agent.modelName || "gemini-2.5-flash",
      systemPrompt: agent.agentConfig?.systemPrompt || "",
      baseUrl: agent.deploymentInfo?.url || "",
    };
    sessionStorage.setItem(
      "forgeq:marketplace:prefill",
      JSON.stringify(prefill),
    );
    nav(
      `/projects/ai-testing?view=agent-testing&proto=${agent.protocol || "kre"}`,
    );
  };

  const onImportCollection = async () => {
    if (!agent) return;
    try {
      const postman = (
        await import("@/utils/agentToCollection")
      ).agentToPostmanCollection({
        id: agent.id,
        name: agent.name,
        description: agent.description,
        deployedApis: agent.deployedApis,
      } as any);
      const blob = new Blob([JSON.stringify(postman, null, 2)], {
        type: "application/json",
      });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${agent.name.replace(/\W+/g, "_").toLowerCase()}.postman_collection.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(link.href);
      toast.success("Postman collection downloaded");
    } catch (e: any) {
      toast.error("Import failed", { description: e?.message });
    }
  };

  // ─── Chat send logic ─────────────────────────────────────────────────

  const handleSend = async () => {
    if (!agent || (!message.trim() && action !== "status")) return;

    // For non-KRE agents, show a message and don't send
    if (agent.protocol !== "kre") {
      toast.info(
        "Chat is not available for this agent. Use 'Try in Playground' to test it.",
      );
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "This is a public API agent. Chat is not supported here. Please click **Try in Playground** to test this agent's endpoints.",
        },
      ]);
      return;
    }

    const userMsg = message.trim();
    if (action !== "status") setMessage("");
    setChatMessages((prev) => [
      ...prev,
      { role: "user", content: userMsg || "Fetching status..." },
    ]);
    setChatLoading(true);
    setLastResult(null);

    const startTime = performance.now();

    try {
      const base = kreBaseUrl();
      let endpoint = "";
      let body: any = {};
      let method = "POST";

      if (action === "chat") {
        endpoint = `${base}/api/proxy/agent-chat/${realId}`;
        body = { message: userMsg, session_id: sessionId || null };
      } else if (action === "run") {
        endpoint = `${base}/api/proxy/agent-run/${realId}`;
        body = { input: userMsg, session_id: sessionId || null };
      } else {
        endpoint = `${base}/api/proxy/agent-status/${realId}`;
        method = "GET";
        body = {};
      }

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        ...(method !== "GET" && { body: JSON.stringify(body) }),
      });
      const data = await response.json();

      const endTime = performance.now();
      const latency = endTime - startTime;

      const inner = data?.body || data;
      const reply =
        inner.response ||
        inner.answer ||
        inner.text ||
        inner.message ||
        inner.status ||
        JSON.stringify(inner);

      let usedTokens = 0,
        tokenLimit = 0;
      if (inner.public_token_usage) {
        usedTokens = inner.public_token_usage.tokensUsed ?? 0;
        tokenLimit = inner.public_token_usage.tokenLimit ?? 0;
        if (tokenLimit > 0) {
          setTokenUsage({ used: usedTokens, limit: tokenLimit });
        }
      }

      if (inner.session_id && !sessionId) {
        setSessionId(inner.session_id);
      }

      const status = data.status || data.ok ? "Success" : "Failed";
      setLastCost(0);
      setLastLatency(latency);
      setLastTokens(usedTokens);
      setLastStatus(status);
      setLastResult({
        finalText: reply,
        latencyMs: latency,
        totalCostUsd: 0,
        totalTokens: usedTokens,
        ok: data.ok !== false,
      });

      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: reply },
      ]);
    } catch (e: any) {
      toast.error("Request failed", { description: e?.message });
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Error: ${e.message || "Something went wrong"}`,
        },
      ]);
      setLastStatus("Error");
    } finally {
      setChatLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleRefresh = () => {
    fetchProxyAndMerge();
    toast.info("Refreshing agent details...");
  };

  // ─── Skeleton ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl p-6 space-y-6">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="flex items-start gap-4">
          <Skeleton className="h-16 w-16 rounded-md" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-72" />
            <Skeleton className="h-4 w-56" />
          </div>
        </div>
        <Skeleton className="h-24 w-full" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="h-[400px] lg:col-span-2 w-full" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6">
        <Bot className="h-12 w-12 text-text-muted opacity-50" />
        <p className="mt-4 text-text-muted">Agent not found</p>
        <button
          onClick={() => nav("/projects/ai-testing?view=marketplace")}
          className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white"
        >
          Back to Marketplace
        </button>
      </div>
    );
  }

  const {
    deploymentInfo,
    deployedApis,
    public_token_limit,
    capabilities,
    tools,
    chatHistory,
    updatedAt,
  } = agent;
  const tokenPct = tokenUsage
    ? Math.min(100, (tokenUsage.used / Math.max(1, tokenUsage.limit)) * 100)
    : 0;

const updatedDate = updatedAt ? formatDate(new Date(updatedAt)) : "—";

  // ─── Render ──────────────────────────────────────────────────────────

  return (
    <div className=" p-6 space-y-6" data-testid="ai-testing-agent-detail">
      {/* ─── Top Bar ─── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          onClick={() => nav("/projects/ai-testing?view=marketplace")}
          className="inline-flex items-center gap-2 text-sm font-medium text-text-muted hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Marketplace
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={tryAgent}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all hover:scale-[1.02]"
          >
            <Sparkles className="h-4 w-4" /> Try in Playground
          </button>
          <button
            onClick={onImportCollection}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-4 py-2 text-sm font-semibold hover:bg-elevated transition-all"
          >
            <Boxes className="h-4 w-4" /> Import as Collection
          </button>
        </div>
      </div>

      {/* ─── Hero / Header ─── */}
      <div className="flex items-start gap-5 p-5 rounded-2xl bg-gradient-to-br from-surface via-elevated to-surface border border-border shadow-sm">
        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 text-3xl shadow-inner">
          <Bot className="h-8 w-8 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="truncate text-2xl font-bold text-text-primary">
              {agent.name}
            </h1>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-xs font-semibold uppercase",
                agent.status === "deployed" || agent.status === "available"
                  ? "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30"
                  : "bg-amber-500/15 text-amber-600 border border-amber-500/30",
              )}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {agent.status}
            </span>
            <span className="rounded-md bg-elevated px-2 py-0.5 font-mono text-xs font-semibold text-text-muted border border-border">
              v{agent.version}
            </span>
            <button
              onClick={handleRefresh}
              className="p-1 rounded-md hover:bg-elevated transition-colors text-text-muted hover:text-text-primary"
              title="Refresh agent details"
            >
              <RotateCw className="h-3.5 w-3.5" />
            </button>
            {lastSynced && (
              <span className="text-[10px] text-text-muted">
                Synced {timeAgo(lastSynced)}
              </span>
            )}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-text-muted">
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />{" "}
              {agent.vendor || agent.creatorName || "unknown"}
            </span>
            <span className="flex items-center gap-1">
              <Layers className="h-3 w-3" />
              <Tooltip content="Agent framework: LangChain" side="bottom">
                <span className="cursor-help">{agent.framework}</span>
              </Tooltip>
            </span>
          </div>

          {/* ─── Description ─── */}
          <div
            ref={descContainerRef}
            className="relative mt-2 text-sm leading-relaxed text-text-secondary"
          >
            <p
              className={cn(
                "whitespace-pre-line",
                !expandedDesc && "line-clamp-3",
              )}
            >
              {agent.description}
            </p>
            {!expandedDesc &&
              agent.description &&
              agent.description.length > 200 && (
                <>
                  <div className="absolute bottom-0 right-0 w-24 h-6 bg-gradient-to-l from-surface to-transparent pointer-events-none" />
                  <button
                    onClick={() => setExpandedDesc(true)}
                    className="absolute bottom-0 right-0 text-primary font-semibold text-xs hover:underline z-10 bg-surface pl-1"
                  >
                    Read more →
                  </button>
                </>
              )}
            {expandedDesc && (
              <button
                onClick={() => setExpandedDesc(false)}
                className="block text-primary font-semibold text-xs hover:underline mt-1"
              >
                Show less
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─── Stats Tiles ─── */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <TileWithTooltip
          icon={ServerCog}
          label="Deployment"
          value={deploymentInfo.status || "—"}
        />
        <TileWithTooltip
          icon={GitBranch}
          label="Service"
          value={deploymentInfo.serviceName || "—"}
        />
        <TileWithTooltip
          icon={Globe}
          label="Region"
          value={deploymentInfo.region || "—"}
        />
        <TileWithTooltip
          icon={Coins}
          label="Token Limit"
          value={public_token_limit ? public_token_limit.toLocaleString() : "—"}
        />
        <TileWithTooltip
          icon={Award}
          label="Version"
          value={agent.version || "—"}
        />
        <TileWithTooltip icon={Clock} label="Updated At" value={updatedDate} />
      </div>

      {/* ─── Deployment URL ─── */}
      {deploymentInfo.url && (
        <div className="rounded-lg border border-border bg-surface/60 p-4 backdrop-blur-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-medium text-text-muted">
              Deployed URL
            </span>
            <div className="flex items-center gap-2">
              <code className="truncate rounded bg-elevated px-3 py-1 font-mono text-sm text-text-primary border border-border/50 max-w-xs md:max-w-md">
                {deploymentInfo.url}
              </code>
              <button
                onClick={() => copy(deploymentInfo.url, "URL")}
                className="grid h-8 w-8 place-items-center rounded-md border border-border bg-surface hover:bg-elevated transition-colors"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
              <a
                href={deploymentInfo.url}
                target="_blank"
                rel="noreferrer"
                className="grid h-8 w-8 place-items-center rounded-md border border-border bg-surface hover:bg-elevated transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ─── Capabilities & Tools ─── */}
      {(capabilities.length > 0 || tools.length > 0) && (
        <div className="flex flex-wrap gap-6 p-4 rounded-lg border border-border bg-surface/40">
          {capabilities.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-1.5">
                Capabilities
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {capabilities.map((c) => (
                  <span
                    key={c}
                    className="rounded-full border border-border bg-elevated px-3 py-1 text-xs font-medium"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}
          {tools.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-1.5">
                Tools
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {tools.map((t) => (
                  <span
                    key={t}
                    className="rounded-full border border-border bg-elevated px-3 py-1 font-mono text-xs"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Chat History ─── */}
      {chatHistory && chatHistory.length > 0 && (
        <details className="group rounded-lg border border-border bg-surface/40 overflow-hidden">
          <summary className="flex cursor-pointer items-center justify-between px-5 py-3 text-sm font-semibold text-text-muted hover:text-text-primary transition-colors">
            <span>
              <MessageSquare className="inline h-4 w-4 mr-2" /> Agent Knowledge
              Base ({chatHistory.length} entries)
            </span>
            <span className="text-xs opacity-50 group-open:rotate-180 transition-transform">
              ▼
            </span>
          </summary>
          <div className="border-t border-border p-4 max-h-60 overflow-y-auto space-y-2">
            {chatHistory.map((entry, i) => (
              <div
                key={i}
                className="text-xs text-text-secondary border-b border-border/40 pb-2 last:border-0"
              >
                <div className="font-semibold text-text-muted">
                  {entry.role}
                </div>
                <pre className="whitespace-pre-wrap font-mono text-[10px] leading-relaxed bg-elevated/30 p-2 rounded">
                  {entry.content}
                </pre>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* ─── Endpoints ─── */}
      {deployedApis.length > 0 && (
        <details className="group rounded-lg border border-border bg-surface/40 overflow-hidden">
          <summary className="flex cursor-pointer items-center justify-between px-5 py-3 text-sm font-semibold text-text-muted hover:text-text-primary transition-colors">
            <span>
              <Globe className="inline h-4 w-4 mr-2" /> Deployed endpoints (
              {deployedApis.length})
            </span>
            <span className="text-xs opacity-50 group-open:rotate-180 transition-transform">
              ▼
            </span>
          </summary>
          <div className="border-t border-border p-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-elevated/50 text-left text-xs uppercase text-text-muted">
                <tr>
                  <th className="px-3 py-2 rounded-l-lg">Method</th>
                  <th className="px-3 py-2">Label / Path</th>
                  <th className="px-3 py-2 text-right rounded-r-lg">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {deployedApis.map((api, i) => {
                  const isCopied = copiedIndex[i] || false;
                  return (
                    <tr
                      key={i}
                      className="hover:bg-elevated/20 transition-colors"
                    >
                      <td className="px-3 py-2">
                        <span
                          className={cn(
                            "rounded border px-2 py-0.5 font-mono text-xs font-bold",
                            api.method === "GET" &&
                              "border-emerald-500/30 bg-emerald-500/10 text-emerald-600",
                            api.method === "POST" &&
                              "border-amber-500/30 bg-amber-500/10 text-amber-600",
                            api.method === "PUT" &&
                              "border-blue-500/30 bg-blue-500/10 text-blue-600",
                            api.method === "DELETE" &&
                              "border-red-500/30 bg-red-500/10 text-red-600",
                          )}
                        >
                          {api.method}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-text-primary">
                              {api.label}
                            </span>
                            <span className="font-mono text-xs text-text-muted">
                              {api.path}
                            </span>
                          </div>
                          <Tooltip content={api.url} side="bottom">
                            <div className="truncate max-w-[200px] md:max-w-[350px] font-mono text-[10px] text-text-muted">
                              {api.url}
                            </div>
                          </Tooltip>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex justify-end">
                          <Tooltip
                            content={isCopied ? "Copied!" : "Copy URL"}
                            side="top"
                          >
                            <button
                              onClick={async () => {
                                await copy(api.url, "URL");
                                setCopiedIndex({ ...copiedIndex, [i]: true });
                                setTimeout(() => {
                                  setCopiedIndex((prev) => ({
                                    ...prev,
                                    [i]: false,
                                  }));
                                }, 2000);
                              }}
                              className="p-1.5 rounded-md hover:bg-elevated transition-colors text-text-muted hover:text-text-primary"
                            >
                              {isCopied ? (
                                <Check className="h-4 w-4 text-emerald-500" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </button>
                          </Tooltip>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </details>
      )}

      {/* ─── Chat + Stats grid ─── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr,1.2fr]">
        {/* Chat window */}
        <div className="flex flex-col rounded-2xl border border-border bg-surface shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 border-b border-border px-5 py-3 bg-elevated/30">
            <MessageSquare className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-text-primary">
              Live Chat
            </span>
            <span className="ml-auto text-xs text-text-muted">
              {chatMessages.length} messages
            </span>
          </div>
          <div
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[420px] min-h-[300px] bg-gradient-to-b from-surface to-elevated/10"
          >
            {chatMessages.length === 0 ? (
              <div className="grid h-full place-items-center text-center text-text-muted">
                <div>
                  <Bot className="mx-auto h-12 w-12 opacity-20" />
                  <p className="mt-3 text-sm font-medium">No messages yet</p>
                  <p className="text-xs">
                    Send a message below to start the conversation
                  </p>
                </div>
              </div>
            ) : (
              chatMessages.map((msg, i) => {
                const isUser = msg.role === "user";
                return (
                  <div
                    key={i}
                    className={cn(
                      "flex items-start gap-2.5",
                      isUser ? "flex-row-reverse" : "",
                    )}
                  >
                    <div
                      className={cn(
                        "grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold",
                        isUser
                          ? "bg-primary text-white"
                          : "bg-elevated border border-border text-text-secondary",
                      )}
                    >
                      {isUser ? "U" : <Bot className="h-4 w-4" />}
                    </div>
                    <div
                      className={cn(
                        "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm",
                        isUser
                          ? "bg-primary text-white rounded-tr-none"
                          : "bg-probestack-bg border border-border text-text-primary rounded-tl-none",
                      )}
                    >
                      {isUser ? (
                        <span className="whitespace-pre-wrap">
                          {msg.content}
                        </span>
                      ) : (
                        <div className="prose prose-sm max-w-none text-text-primary">
                          {formatAssistantMessage(msg.content)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            {chatLoading && (
              <div className="flex items-start gap-2.5">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-elevated border border-border">
                  <Bot className="h-4 w-4 text-text-muted" />
                </div>
                <div className="rounded-2xl bg-elevated px-4 py-2.5">
                  <Loader2 className="h-4 w-4 animate-spin text-text-muted" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-border p-4 bg-elevated/20">
            <div className="flex gap-2">
              <textarea
                ref={inputRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  action === "status"
                    ? "Status check (no message needed)"
                    : "Type a message..."
                }
                disabled={chatLoading}
                rows={1}
                className="flex-1 resize-none rounded-lg border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all disabled:opacity-50"
              />
              <button
                onClick={handleSend}
                disabled={
                  chatLoading || (action !== "status" && !message.trim())
                }
                className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:scale-100"
              >
                {chatLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Send"
                )}
              </button>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-text-muted">
              <span className="font-semibold">Action:</span>
              <div className="inline-flex gap-1 rounded-md border border-border bg-surface p-0.5">
                {(["chat", "run", "status"] as const).map((a) => (
                  <button
                    key={a}
                    onClick={() => setAction(a)}
                    className={cn(
                      "rounded-md px-3 py-1 text-xs font-semibold transition-all",
                      action === a
                        ? "bg-primary text-white shadow-sm"
                        : "text-text-secondary hover:bg-elevated",
                    )}
                  >
                    {a === "chat"
                      ? "Chat"
                      : a === "run"
                        ? "Run Task"
                        : "Status"}
                  </button>
                ))}
              </div>
              {sessionId && (
                <span className="text-primary">
                  Session: {sessionId.slice(0, 8)}
                </span>
              )}
              {agent.protocol !== "kre" && (
                <span className="text-amber-500 text-xs ml-2">
                  Chat not available for this agent - use Playground
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stats Dashboard */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
            <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
              <Activity className="h-3.5 w-3.5" /> Execution Stats
            </h3>
            <div className="mt-3 space-y-3">
              <StatRow
                label="Status"
                value={lastStatus || "—"}
                color={
                  lastStatus === "Success"
                    ? "text-emerald-600"
                    : lastStatus === "Error"
                      ? "text-red-500"
                      : ""
                }
              />
              <StatRow
                label="Latency"
                value={lastLatency ? `${lastLatency.toFixed(0)} ms` : "—"}
              />
              <StatRow
                label="Cost (USD)"
                value={lastCost ? `$${lastCost.toFixed(6)}` : "—"}
                highlight
              />
              <StatRow
                label="Tokens"
                value={lastTokens ? lastTokens.toLocaleString() : "—"}
              />
            </div>
          </div>

          {tokenUsage && (
            <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-5 backdrop-blur-sm shadow-sm">
              <div className="flex items-center justify-between text-sm font-semibold">
                <span className="text-indigo-700 dark:text-indigo-300">
                  Token Budget
                </span>
                <span className="font-mono text-text-primary">
                  {tokenUsage.used.toLocaleString()} /{" "}
                  {tokenUsage.limit.toLocaleString()}
                </span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-elevated">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    tokenPct >= 100
                      ? "bg-red-500"
                      : tokenPct > 80
                        ? "bg-amber-500"
                        : "bg-indigo-500",
                  )}
                  style={{ width: `${tokenPct}%` }}
                />
              </div>
              <button
                onClick={() =>
                  setTokenUsage({ used: 0, limit: tokenUsage.limit })
                }
                className="mt-2 text-xs text-text-muted hover:text-text-primary transition-colors"
              >
                ↻ reset counter
              </button>
            </div>
          )}

          <div className="rounded-2xl border border-border/60 bg-elevated/20 p-4 text-xs text-text-muted">
            <ShieldAlert className="inline h-3.5 w-3.5 mr-1.5 text-amber-500" />
            Sandbox mode. History is{" "}
            <strong className="text-text-primary">not persisted</strong> across
            refreshes. Cost (USD) is not available in sandbox.
          </div>
        </div>
      </div>

      {/* ─── Execution Trace ─── */}
      {lastResult && (
        <div className="mt-2 rounded-2xl border border-border bg-surface/60 p-1">
          <ExecutionTrace result={lastResult} />
        </div>
      )}
    </div>
  );
};

// ─── Sub-components ────────────────────────────────────────────────────

const TileWithTooltip = ({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: any;
}) => {
  const showTooltip = typeof value === "string" && value.length > 15;
  const displayValue = showTooltip ? value.slice(0, 15) + "…" : value;
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
            <div className="truncate text-sm font-semibold text-text-primary">
              {displayValue}
            </div>
          </Tooltip>
        ) : (
          <div className="truncate text-sm font-semibold text-text-primary">
            {value}
          </div>
        )}
      </div>
    </div>
  );
};

const StatRow = ({
  label,
  value,
  highlight,
  color,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  color?: string;
}) => (
  <div className="flex items-center justify-between border-b border-border/40 pb-2 last:border-0">
    <span className="text-xs text-text-muted">{label}</span>
    <span
      className={cn(
        "text-xs font-mono font-semibold",
        highlight ? "text-primary" : "text-text-primary",
        color,
      )}
    >
      {value}
    </span>
  </div>
);

const Skeleton = ({ className }: { className?: string }) => (
  <div
    className={`animate-pulse rounded bg-gray-200 dark:bg-gray-700 ${className}`}
  />
);

function timeAgo(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function formatDate(date: Date): string {
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}