/**
 * AiTestingPanel — left navigation rail for `/projects/ai-testing`.
 *
 * Mirrors the visual rhythm of `MCPPanel`: brand-block on top with live
 * counters, a single vertical list of nav rows (icon + label + subtitle),
 * and a pinned footer that shows the active suite (or invites the user
 * to pick one).
 *
 * URL state (`?view` / `?suite` / `?run`) is the source of truth — every
 * click here just rewrites the query-string, so deep-links + browser
 * back/forward keep working.
 */
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Activity, FlaskConical, Zap, History, Bot, Server, Webhook as WebhookIcon,
  BarChart3, KeyRound, ChevronRight, RotateCw, Sparkles, Plug, Store, Cpu, Coins, BookOpen,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useWorkspaceStore } from '@/stores/workspace.store';
import {
  fetchStats, listSuites, fetchTokenUsage,
  type TestSuite, type Stats, type TokenUsageRollup,
} from '@/services/aiTesting.service';
import { SidebarShell } from './SidebarShell';
import { cn } from '@/utils/cn';

type View =
  | 'overview' | 'LLM' | 'suites' | 'runs'
  | 'agents'   | 'agent-testing' | 'marketplace'
  | 'mcp'   | 'webhooks' | 'analytics' | 'keys' | 'docs';

interface NavRow { key: View; icon: LucideIcon; label: string; sub: string; badge?: string | null }

export const AiTestingPanel = () => {
  const workspaceId = useWorkspaceStore((s) => s.currentId);
  const [params, setParams] = useSearchParams();
  const nav = useNavigate();
  const view = (params.get('view') as View) || 'analytics';
  const selectedSuiteId = params.get('suite');

  const [stats, setStats]   = useState<Stats | null>(null);
  const [suites, setSuites] = useState<TestSuite[]>([]);
  const [tu, setTu]         = useState<TokenUsageRollup | null>(null);

  /* ─── live counts that drive the brand-block badges ─── */
  useEffect(() => {
    if (!workspaceId) return;
    let alive = true;
    const load = async () => {
      try {
        const [st, sus, tok] = await Promise.all([
          fetchStats(workspaceId).catch(() => null),
          listSuites(workspaceId, '', 0, 200).catch(() => ({ items: [] as TestSuite[], total: 0 })),
          fetchTokenUsage(workspaceId, 30).catch(() => null),
        ]);
        if (!alive) return;
        setStats(st);
        setSuites(sus?.items ?? []);
        setTu(tok);
      } catch { /* ignore */ }
    };
    load();
    const refresh = () => load();
    window.addEventListener('forgeq:ai-testing:refresh', refresh);
    return () => { alive = false; window.removeEventListener('forgeq:ai-testing:refresh', refresh); };
  }, [workspaceId]);

  const goView = (k: View) => {
    const next = new URLSearchParams();
    next.set('view', k);
    if (k === 'suites' && selectedSuiteId) next.set('suite', selectedSuiteId);
    setParams(next, { replace: true });
    if (!window.location.pathname.startsWith('/projects/ai-testing')) {
      nav(`/projects/ai-testing?view=${k}`);
    }
  };

  const activeSuite = suites.find((s) => s.id === selectedSuiteId);

  const NAV: NavRow[] = [
      { key: 'docs',          icon: BookOpen,     label: 'Docs · Guide',   sub: 'How everything works' },
    // { key: 'overview',      icon: Sparkles,     label: 'Overview',       sub: 'Live metrics · trends' },
    { key: 'analytics',     icon: BarChart3,    label: 'Analytics',      sub: 'Model · cost · latency' },
    { key: 'marketplace',   icon: Store,        label: 'Marketplace',    sub: 'Discover · try agents' },
    { key: 'LLM',           icon: Zap,          label: 'LLM test',       sub: 'One-shot probe · no save' },
    { key: 'suites',        icon: FlaskConical, label: 'Test Suites',    sub: 'Author cases · run them',
      badge: suites.length > 0 ? String(suites.length) : null },
      { key: 'agent-testing', icon: Cpu,          label: 'Agent Testing',  sub: 'Direct · A2A · ACP · MCP' },
      { key: 'agents',        icon: Bot,          label: 'Agent Configs',  sub: 'Saved · reusable defs' },
      { key: 'mcp',           icon: Server,       label: 'MCP Servers',    sub: 'Pulled from MCP Studio' },
      // { key: 'webhooks',      icon: WebhookIcon,  label: 'Webhooks',       sub: 'CI · alerts · callbacks' },
      { key: 'runs',          icon: History,      label: 'Run History',    sub: 'Verdicts · baselines',
        badge: stats?.totalRuns ? String(stats.totalRuns) : null },
  ];

  return (
    <SidebarShell icon={Activity} title="AI Testing" testId="ai-testing-panel">
      <div className="flex h-full flex-col">
        {/* ─── Brand block ─── */}
        <div className="space-y-1 p-3">
          <div className="rounded-lg border border-primary/40 bg-primary-muted/40 p-3"
               data-testid="ai-testing-brand-block">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-text-primary">LLM & Agent Eval</span>
              <span className="rounded bg-primary/30 px-1.5 py-0.5 text-[11px] font-bold text-primary">BETA</span>
            </div>
            <p className="mt-1 text-xs text-text-secondary">
              Evaluate prompts, agents &amp; RAG with assertions, cost &amp; latency budgets.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <Badge color="success" label={`${stats?.succeeded ?? 0} passed`} />
              <Badge color={stats?.failed ? 'danger' : 'muted'} label={`${stats?.failed ?? 0} failed`} />
              <Badge color={stats?.running ? 'warning' : 'muted'} label={`${stats?.running ?? 0} running`} />
              <TokenBudgetBadge tu={tu} />
            </div>
          </div>
        </div>

        {/* ─── Nav rows ─── */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-2" data-testid="ai-testing-nav">
  {NAV.map(({ key, icon: Icon, label, sub, badge }) => {
    const active = view === key;
    return (
      <button
        key={key}
        type="button"
        onClick={() => goView(key)}
        data-testid={`ai-testing-nav-${key}`}
        className={cn(
          'flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left transition-colors',
          active
            ? 'bg-primary-muted text-primary'
            : 'text-text-primary hover:bg-hover hover:text-white',
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
          <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-primary' : 'text-text-primary')} />
          <div className="min-w-0">
            <div className="truncate text-sm">{label}</div>
            <div className="truncate text-xs text-text-muted">{sub}</div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {badge && (
            <span className={cn(
              'rounded-full px-1.5 py-0.5 font-mono text-[11px]',
              active ? 'bg-primary/30 text-primary' : 'bg-elevated text-text-muted',
            )}>{badge}</span>
          )}
          {active && <ChevronRight className="h-3 w-3 text-primary" />}
        </div>
      </button>
    );
  })}
</nav>

        {/* ─── Pinned: Active suite + API keys footer ─── */}
        <div className="border-t border-border bg-surface/40 p-3" data-testid="ai-testing-active-suite-pin">
          {/* <div className="mb-1.5 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              Active suite
            </span>
            {activeSuite && (
              <button
                type="button"
                onClick={() => goView('suites')}
                data-testid="ai-testing-active-suite-clear"
                className="text-xs text-primary hover:underline"
              >
                <RotateCw className="inline h-2.5 w-2.5" /> Switch
              </button>
            )}
          </div> */}
          {/* {activeSuite ? (
            <button
              type="button"
              onClick={() => setParams({ view: 'suites', suite: activeSuite.id! }, { replace: true })}
              data-testid="ai-testing-active-suite-card"
              className="flex w-full items-start gap-2 rounded-md border border-border bg-elevated/40 p-2 text-left transition-colors hover:border-primary/40 hover:bg-hover/50"
            >
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{activeSuite.name}</div>
                <div className="truncate text-xs text-text-muted">
                  {activeSuite.provider}/{activeSuite.model} · {activeSuite.suiteType ?? 'prompt'}
                </div>
              </div>
              <Plug className="mt-1 h-3 w-3 shrink-0 text-primary" />
            </button>
          ) : (
            <div className="rounded-md border border-dashed border-border bg-surface/30 px-2 py-3 text-center text-xs text-text-muted"
                 data-testid="ai-testing-active-suite-empty">
              No suite selected. Pick one from <strong>Test Suites</strong>.
            </div>
          )} */}

          <button
            type="button"
            onClick={() => goView('keys')}
            data-testid="ai-testing-keys-footer-btn"
            className={cn(
              'flex w-full items-center justify-between gap-2 rounded-md border px-2 py-2 text-left transition-colors',
              view === 'keys'
                ? 'border-primary/40 bg-primary-muted text-primary'
                : 'border-border bg-surface/40 text-text-secondary hover:border-primary/40 hover:bg-hover/50',
            )}
          >
            <div className="flex items-center gap-2">
              <KeyRound className={cn('h-3.5 w-3.5', view === 'keys' ? 'text-primary' : 'text-text-muted')} />
              <div>
                <div className="text-xs font-semibold">API keys</div>
                <div className="text-[11px] text-text-muted">OpenAI · Anthropic · Google · …</div>
              </div>
            </div>
            <ChevronRight className="h-3 w-3 text-text-muted" />
          </button>
        </div>
      </div>
    </SidebarShell>
  );
};

/* ─── tiny badge component (matches MCPPanel) ─── */
const Badge = ({ color, label }: { color: 'success' | 'danger' | 'warning' | 'muted'; label: string }) => (
  <span className={cn(
    'inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-xs',
    color === 'success' && 'border-success/40 bg-success-muted text-success',
    color === 'danger'  && 'border-danger/40 bg-danger-muted text-danger',
    color === 'warning' && 'border-warning/40 bg-warning-muted text-warning',
    color === 'muted'   && 'border-border bg-elevated text-text-muted',
  )}>
    <span className="h-1.5 w-1.5 rounded-full bg-current" />
    {label}
  </span>
);

/**
 * TokenBudgetBadge — shows total cost · tokens for the last 30 days
 * with a rich custom tooltip on hover (per-key spend, per-model
 * breakdown, total prompt vs completion tokens).
 */
const TokenBudgetBadge = ({ tu }: { tu: TokenUsageRollup | null }) => {
  const [open, setOpen] = useState(false);
  if (!tu) {
    return <Badge color="muted" label="$0 · 0 tok" />;
  }
  const totalToks = tu.totalTokens.toLocaleString();
  return (
    <span className="relative inline-block"
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          data-testid="ai-testing-token-budget">
      <span className="inline-flex cursor-help items-center gap-1 rounded-full border border-primary/40 bg-primary-muted px-1.5 py-0.5 text-xs font-semibold text-primary">
        <Coins className="h-2.5 w-2.5" />
        ${tu.totalCostUsd.toFixed(4)} · {totalToks} tok
      </span>
      {open && (
        <div className="absolute left-0 top-full z-50 w-72 rounded-md border border-border bg-surface p-3 shadow-xl"
             data-testid="ai-testing-token-tooltip">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold text-text-primary">Token usage · last {tu.windowDays}d</span>
            <span className="font-mono text-xs text-text-muted">{tu.totalRuns} runs</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-xs">
            <Mini label="Prompt"     value={tu.totalTokensIn.toLocaleString()  + ' tok'} />
            <Mini label="Completion" value={tu.totalTokensOut.toLocaleString() + ' tok'} />
            <Mini label="Total"      value={totalToks + ' tok'} />
            <Mini label="Spend"      value={'$' + tu.totalCostUsd.toFixed(6)} />
          </div>

          {tu.keys.length > 0 && (
            <div className="mt-3">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-text-muted">
                Per-key spend
              </div>
              <ul className="space-y-1">
                {tu.keys.slice(0, 5).map((k) => (
                  <li key={k.id} className="flex items-center justify-between gap-2 text-xs"
                      data-testid={`ai-testing-token-key-${k.provider}`}>
                    <span className="truncate">
                      <strong className="text-text-primary">{k.provider}</strong>
                      <span className="text-text-muted"> · ••••{k.last4}</span>
                    </span>
                    <span className="shrink-0 font-mono tabular-nums text-text-secondary">
                      ${k.spendUsd.toFixed(6)} · {k.tokensUsed.toLocaleString()} tok
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {tu.perModel.length > 0 && (
            <div className="mt-3">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-text-muted">
                Top models by cost
              </div>
              <ul className="space-y-1">
                {tu.perModel.slice(0, 4).map((m, i) => (
                  <li key={i} className="flex items-center justify-between gap-2 text-xs">
                    <span className="truncate font-mono">{m.provider}/{m.model}</span>
                    <span className="shrink-0 font-mono tabular-nums text-text-secondary">
                      ${m.cost.toFixed(6)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </span>
  );
};

const Mini = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-md border border-border/60 bg-elevated/40 px-2 py-1.5">
    <div className="text-[11px] uppercase tracking-wide text-text-muted">{label}</div>
    <div className="font-mono text-xs font-semibold tabular-nums text-text-primary">{value}</div>
  </div>
);
