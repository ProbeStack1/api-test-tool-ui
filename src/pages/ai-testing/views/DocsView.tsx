/**
 * DocsView — in-app user guide for the entire AI Testing module.
 * Zero compilation errors. Strict TypeScript compatible.
 * Fullwidth layout (no max-w-3xl constraint).
 */
import {
  useEffect,
  useState,
  useCallback,
  useRef,
  createContext,
  useContext,
  type ReactNode,
  type ComponentType,
  type RefObject,
} from 'react';
import {
  BookOpen,
  Sparkles,
  Zap,
  FlaskConical,
  History,
  Cpu,
  Bot,
  Server,
  Webhook,
  BarChart3,
  KeyRound,
  Store,
  ArrowRight,
  ChevronRight,
  Copy,
  Check,
  Menu,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/utils/cn';

// ─── Types ─────────────────────────────────────────────────────────

interface SectionDef {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  description?: string;
}

interface Step {
  n: number;
  body: string;
}

interface AssertionRow {
  type: string;
  config: string;
}

interface DocsContextValue {
  activeSection: string;
  goToSection: (id: string) => void;
  isMobileNavOpen: boolean;
  setIsMobileNavOpen: (open: boolean) => void;
  prefersReducedMotion: boolean;
}

// ─── Constants ─────────────────────────────────────────────────────

const SECTIONS: SectionDef[] = [
  { id: 'getting-started', label: 'Getting started', icon: Sparkles, description: 'Overview & workflow' },
  { id: 'add-key', label: 'Provider keys', icon: KeyRound, description: 'BYOK encryption' },
  { id: 'quick-test', label: 'Quick test', icon: Zap, description: 'One-shot probe' },
  { id: 'suites', label: 'Test Suites', icon: FlaskConical, description: 'Author & run cases' },
  { id: 'assertions', label: 'Assertions', icon: ChevronRight, description: 'Verify behavior' },
  { id: 'runs', label: 'Run history', icon: History, description: 'Baselines & diffs' },
  { id: 'agent-testing', label: 'Agent Testing', icon: Cpu, description: 'Playground' },
  { id: 'agent-configs', label: 'Agent Configs', icon: Bot, description: 'Reusable definitions' },
  { id: 'marketplace', label: 'Marketplace', icon: Store, description: 'Curated agents' },
//   { id: 'mcp', label: 'MCP servers', icon: Server, description: 'Read-only mirror' },
//   { id: 'webhooks', label: 'Webhooks', icon: Webhook, description: 'CI/CD callbacks' },
//   { id: 'analytics', label: 'Analytics', icon: BarChart3, description: 'Tokens & cost' },
];

// ─── Hooks ─────────────────────────────────────────────────────────

function useScrollSpy(sectionIds: string[]) {
  const [activeId, setActiveId] = useState<string>(sectionIds[0] ?? '');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target.id) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: '-20% 0px -55% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] }
    );

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [sectionIds]);

  return activeId;
}

function useClipboard(timeout = 2000) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copy = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
      } catch {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
          document.execCommand('copy');
          setCopied(true);
        } catch {
          // Fail silently
        }
        document.body.removeChild(textarea);
      }

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setCopied(false), timeout);
    },
    [timeout]
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return { copied, copy };
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mql.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return reduced;
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

// ─── Context ───────────────────────────────────────────────────────

const DocsContext = createContext<DocsContextValue | null>(null);

function useDocs() {
  const ctx = useContext(DocsContext);
  if (!ctx) throw new Error('useDocs must be used within DocsProvider');
  return ctx;
}

// ─── Sub-components ────────────────────────────────────────────────

function SectionNav() {
  const { activeSection, goToSection, isMobileNavOpen, setIsMobileNavOpen } = useDocs();
  const isMobile = useMediaQuery('(max-width: 1024px)');
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!isMobile || !isMobileNavOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setIsMobileNavOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isMobile, isMobileNavOpen, setIsMobileNavOpen]);

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const next = SECTIONS[index + 1];
      if (next) {
        goToSection(next.id);
        const nextBtn = e.currentTarget.parentElement?.nextElementSibling?.querySelector('button');
        if (nextBtn) (nextBtn as HTMLElement).focus();
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prev = SECTIONS[index - 1];
      if (prev) {
        goToSection(prev.id);
        const prevBtn = e.currentTarget.parentElement?.previousElementSibling?.querySelector('button');
        if (prevBtn) (prevBtn as HTMLElement).focus();
      }
    }
  };

  const navItems = (
    <div className={cn(
      'flex gap-1.5',
      isMobile ? 'flex-col px-4 py-2' : 'items-center overflow-x-auto pb-1 [scrollbar-width:thin]'
    )}>
      {SECTIONS.map((section, idx) => {
        const Icon = section.icon;
        const isActive = activeSection === section.id;
        return (
          <div key={section.id} className={cn('flex items-center', !isMobile && 'shrink-0')}>
            <button
              type="button"
              onClick={() => {
                goToSection(section.id);
                if (isMobile) setIsMobileNavOpen(false);
              }}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              data-testid={`ai-testing-docs-toc-${section.id}`}
              aria-current={isActive ? 'true' : undefined}
              className={cn(
                'group inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-1',
                isActive
                  ? 'border-primary bg-primary text-white shadow-sm shadow-primary/20'
                  : 'border-border bg-surface text-text-secondary hover:border-primary/40 hover:text-text-primary hover:bg-primary/5',
                isMobile && 'w-full justify-start py-2.5 text-sm'
              )}
            >
              <Icon className={cn(
                'shrink-0 transition-colors',
                isMobile ? 'h-4 w-4' : 'h-3.5 w-3.5',
                isActive ? 'text-white' : 'text-text-muted group-hover:text-text-primary'
              )} />
              <span className="whitespace-nowrap">{section.label}</span>
              {isMobile && section.description && (
                <span className="ml-auto text-xs text-text-muted">{section.description}</span>
              )}
            </button>
            {!isMobile && idx < SECTIONS.length - 1 && (
              <ChevronRight className="mx-0.5 h-3 w-3 shrink-0 text-text-muted/40" aria-hidden="true" />
            )}
          </div>
        );
      })}
    </div>
  );

  if (isMobile) {
    return (
      <>
        <button
          type="button"
          onClick={() => setIsMobileNavOpen(true)}
          className="mb-4 inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-text-secondary hover:text-text-primary"
          aria-expanded={isMobileNavOpen}
          aria-controls="docs-mobile-nav"
        >
          <Menu className="h-4 w-4" />
          <span>Jump to section</span>
          <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
            {SECTIONS.findIndex((s) => s.id === activeSection) + 1}/{SECTIONS.length}
          </span>
        </button>

        {isMobileNavOpen && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" aria-hidden="true" />
        )}

        <nav
          ref={navRef}
          id="docs-mobile-nav"
          className={cn(
            'fixed inset-y-0 left-0 z-50 w-72 transform bg-surface shadow-2xl transition-transform duration-300 ease-out',
            isMobileNavOpen ? 'translate-x-0' : '-translate-x-full'
          )}
          aria-label="Documentation sections"
        >
          <div className="flex items-center justify-between border-b border-border p-4">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              <span className="font-semibold">AI Testing Docs</span>
            </div>
            <button
              type="button"
              onClick={() => setIsMobileNavOpen(false)}
              className="grid h-8 w-8 place-items-center rounded-lg hover:bg-elevated"
              aria-label="Close navigation"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {navItems}
        </nav>
      </>
    );
  }

  return (
    <nav
      className="sticky top-0 z-10 -mx-8 -my-6 mb-6 border-b border-border bg-surface/95 px-6  backdrop-blur"
      aria-label="Documentation sections"
    >
      <div className="mb-2 flex items-center gap-2">
        <BookOpen className="h-4 w-4 text-primary" aria-hidden="true" />
        <h2 className="text-base font-semibold">AI Testing — docs</h2>
      </div>
      {navItems}
    </nav>
  );
}

function Section({
  id,
  title,
  icon: Icon,
  children,
}: {
  id: string;
  title: string;
  icon: ComponentType<{ className?: string }>;
  children: ReactNode;
}) {
  const { prefersReducedMotion } = useDocs();
  const ref = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      id={id}
      className={cn(
        'scroll-mt-24 transition-all duration-500',
        !prefersReducedMotion && (isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0')
      )}
      aria-labelledby={`${id}-heading`}
    >
      <h2
        id={`${id}-heading`}
        className="mb-4 flex items-center gap-2.5 text-xl font-semibold tracking-tight"
      >
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10">
          <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
        </span>
        {title}
      </h2>
      <div className="space-y-4 text-sm leading-relaxed text-text-secondary [&_p]:leading-relaxed [&_code]:rounded-md [&_code]:bg-elevated [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs [&_code]:text-text-primary [&_a]:text-primary [&_a]:underline-offset-2 hover:[&_a]:underline">
        {children}
      </div>
    </section>
  );
}

function Steps({ steps }: { steps: Step[] }) {
  return (
    <ol className="space-y-3" aria-label="Steps">
      {steps.map((step) => (
        <li key={step.n} className="flex gap-3">
          <span
            className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-white shadow-sm shadow-primary/20"
            aria-hidden="true"
          >
            {step.n}
          </span>
          <span className="text-sm leading-relaxed">{step.body}</span>
        </li>
      ))}
    </ol>
  );
}

function Tip({ children }: { children: ReactNode }) {
  return (
    <aside className="rounded-lg border-l-4 border-primary bg-primary/5 p-4 text-sm leading-relaxed">
      <div className="flex gap-2">
        <span aria-hidden="true">💡</span>
        <div>{children}</div>
      </div>
    </aside>
  );
}

function Code({ children }: { children: string }) {
  const { copied, copy } = useClipboard();
  const preRef = useRef<HTMLPreElement>(null);

  return (
    <div className="group relative">
      <pre
        ref={preRef}
        className="overflow-x-auto rounded-lg border border-border bg-elevated/60 p-4 font-mono text-xs leading-relaxed text-text-primary shadow-inner"
        tabIndex={0}
      >
        <code>{children}</code>
      </pre>
      <button
        type="button"
        onClick={() => copy(children)}
        className={cn(
          'absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-md border border-border bg-surface text-text-muted shadow-sm transition-all hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50',
          copied && 'border-success/50 text-success'
        )}
        aria-label={copied ? 'Copied!' : 'Copy to clipboard'}
        title={copied ? 'Copied!' : 'Copy to clipboard'}
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

function AssertionTable({ rows }: { rows: AssertionRow[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full border-collapse text-sm">
        <thead className="border-b border-border bg-elevated/50 text-xs uppercase tracking-wider text-text-muted">
          <tr>
            <th className="px-3 py-2.5 text-left font-medium">Type</th>
            <th className="px-3 py-2.5 text-left font-medium">Example config</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {rows.map((row) => (
            <tr key={row.type} className="transition-colors hover:bg-elevated/30">
              <td className="px-3 py-2.5 font-mono text-xs text-text-primary">{row.type}</td>
              <td className="px-3 py-2.5 font-mono text-xs text-text-secondary">{row.config}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CTA({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group mt-3 inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-4 py-2 text-xs font-semibold text-primary transition-all hover:bg-primary/20 hover:shadow-sm hover:shadow-primary/10 focus:outline-none focus:ring-2 focus:ring-primary/50"
    >
      {label}
      <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
    </button>
  );
}

// ─── Main Component ────────────────────────────────────────────────

export function DocsView({ workspaceId: _workspaceId }: { workspaceId: string }) {
  const nav = useNavigate();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();
  const sectionIds = SECTIONS.map((s) => s.id);
  const activeSection = useScrollSpy(sectionIds);

  const goToSection = useCallback(
    (id: string) => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
      }
    },
    [prefersReducedMotion]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        const firstButton = document.querySelector('[data-testid^="ai-testing-docs-toc-"]') as HTMLElement;
        firstButton?.focus();
      }
      if (e.key === 'Escape' && isMobileNavOpen) {
        setIsMobileNavOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isMobileNavOpen]);

  const assertionRows: AssertionRow[] = [
    { type: 'contains', config: '{"type":"contains","value":"hello"}' },
    { type: 'not_contains', config: '{"type":"not_contains","value":"sorry"}' },
    { type: 'regex', config: '{"type":"regex","pattern":"^\\\\d+$"}' },
    { type: 'json_schema', config: '{"type":"json_schema"}' },
    { type: 'tool_called', config: '{"type":"tool_called","value":"calculate"}' },
    { type: 'latency_ms', config: '{"type":"latency_ms","max":15000}' },
    { type: 'cost_usd', config: '{"type":"cost_usd","max":0.01}' },
    { type: 'semantic_similarity', config: '{"type":"semantic_similarity","value":"reference text"}' },
    { type: 'llm_judge', config: '{"type":"llm_judge","value":"Is answer factually correct?"}' },
    { type: 'toxicity', config: '{"type":"toxicity"}' },
    { type: 'pii_check', config: '{"type":"pii_check"}' },
    { type: 'jailbreak', config: '{"type":"jailbreak"}' },
  ];

  return (
    <DocsContext.Provider
      value={{ activeSection, goToSection, isMobileNavOpen, setIsMobileNavOpen, prefersReducedMotion }}
    >
      {/* Fullwidth container: removed max-w-3xl, added responsive padding */}
      <div className="min-h-screen bg-background p-6" data-testid="ai-testing-docs">
        <SectionNav />

        {/* MAIN CONTENT - NOW FULLWIDTH */}
        <main className="w-full space-y-16 pb-24">
          <Section id="getting-started" title="Getting started" icon={Sparkles}>
            <p className="text-base">
              AI Testing is your LLM &amp; agent evaluation lab. Every conversation,
              tool call, assertion, cost and latency is captured so you can
              answer questions like:
            </p>
            <ul className="list-disc space-y-2 pl-5 marker:text-primary">
              <li>Did <code>gpt-4o</code> regress after I updated the system prompt?</li>
              <li>Is <code>gemini-2.5-flash</code> 10× cheaper than <code>claude-3-5-sonnet</code> on my use case?</li>
              <li>Does my agent stop hallucinating when I add the <code>calculate</code> tool?</li>
            </ul>
            <p>The full flow:</p>
            <Steps steps={[
              { n: 1, body: 'Add a provider API key (or use the workspace-stored one).' },
              { n: 2, body: 'Sanity-check the model with a Quick test.' },
              { n: 3, body: 'Create a Test Suite with cases and assertions.' },
              { n: 4, body: 'Trigger a run (sequential or parallel).' },
              { n: 5, body: 'Save the best run as the baseline; future runs are diffed against it.' },
              { n: 6, body: 'Inspect Analytics / Token usage to compare models & cost over time.' },
            ]} />
            <CTA onClick={() => nav('/projects/ai-testing?view=quick')} label="Open Quick test" />
          </Section>

          <Section id="add-key" title="Add a provider key" icon={KeyRound}>
            <p>
              We use <strong>BYOK</strong> (Bring Your Own Key). Keys are AES-GCM
              encrypted at rest and we only return the last 4 characters. No
              shared / fallback key — your usage is tied to your billing.
            </p>
            <Steps steps={[
              { n: 1, body: 'Click "API keys" at the bottom of the AI Testing sidebar.' },
              { n: 2, body: 'Hit "+ Add key" → pick OpenAI / Anthropic / Google.' },
              { n: 3, body: 'Paste your secret. Save.' },
            ]} />
            <Tip>
              Don't have an OpenAI account? <strong>Google AI Studio</strong> gives a free Gemini key
              (<a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer">aistudio.google.com/app/apikey</a>).
            </Tip>
            <CTA onClick={() => nav('/projects/ai-testing?view=keys')} label="Open API keys" />
          </Section>

          <Section id="quick-test" title="Quick test — one-shot probe" icon={Zap}>
            <p>
              Quick test is a one-call LLM probe — no suite saved, no
              assertions, just a fast "does this model say sensible things?"
              check. Result panel shows tokens, cost, latency, finish reason,
              tool calls (if any) and a full <strong>Execution Trace</strong>.
            </p>
            <Code>{`Provider:  google
Model:     gemini-2.5-flash
Input:     "What is the capital of Japan?"
→ Token usage: 8 prompt + 2 completion · cost $0.000001 · 920 ms`}</Code>
            <CTA onClick={() => nav('/projects/ai-testing?view=quick')} label="Try Quick test" />
          </Section>

          <Section id="suites" title="Test Suites — author & run cases" icon={FlaskConical}>
            <p>
              A <strong>Suite</strong> bundles related test cases against the same
              provider/model. Suite types determine what we send to the model:
            </p>
            <ul className="list-disc space-y-2 pl-5 marker:text-primary">
              <li><code>prompt</code> — single-turn instructions (Q&amp;A bots, code review)</li>
              <li><code>chat</code> — multi-turn conversations</li>
              <li><code>agent</code> — multi-step ReAct loop with tool calling</li>
              <li><code>rag</code> — retrieval-augmented context injection</li>
              <li><code>safety</code> — toxicity / PII / jailbreak resistance</li>
            </ul>
            <p>Each <strong>case</strong> has an input, expected output (optional), and assertions.</p>
            <CTA onClick={() => nav('/projects/ai-testing?view=suites')} label="Open Test Suites" />
          </Section>

          <Section id="assertions" title="Assertions — verify model behavior" icon={ChevronRight}>
            <p>Built-in assertion types (mix &amp; match per case):</p>
            <AssertionTable rows={assertionRows} />
          </Section>

          <Section id="runs" title="Run history & baselines" icon={History}>
            <p>
              Every suite trigger creates a Run with full per-case results,
              token cost, latency. Click any row to drill in.
            </p>
            <Steps steps={[
              { n: 1, body: 'Open a finished run (status = succeeded).' },
              { n: 2, body: 'Click "Save as baseline" — only one baseline per suite; older one auto-clears.' },
              { n: 3, body: 'Future runs of the same suite are diffed against the baseline. Regressions are highlighted.' },
            ]} />
            <Tip>Use baselines before any prompt refactor — protects against silent regressions.</Tip>
            <CTA onClick={() => nav('/projects/ai-testing?view=runs')} label="Open Run history" />
          </Section>

          <Section id="agent-testing" title="Agent Testing playground" icon={Cpu}>
            <p>Four protocols, one playground:</p>
            <ul className="list-disc space-y-2 pl-5 marker:text-primary">
              <li><strong>Direct Agent</strong> — built-in ReAct loop with our tools (<code>echo / get_current_time / calculate</code>). Single, Sequential, Parallel, or Supervisor modes.</li>
              <li><strong>A2A</strong> — call Google Agent-to-Agent endpoints. "Discover Card" reads <code>/.well-known/agent.json</code>, "Send Task" hits <code>tasks/send</code>.</li>
              <li><strong>ACP</strong> — call BeeAI Agent Communication Protocol via <code>/runs</code>.</li>
              <li><strong>MCP</strong> — list-tools / call-tool against any Streamable HTTP MCP server (e.g. DeepWiki). Uses ForgeFuzz's MCP Inspector under the hood (handles SSE handshakes properly).</li>
            </ul>
            <Tip>The right-side <strong>Execution Trace</strong> shows every step: DNS, TCP, TLS, request sent, TTFB, LLM round-trip, tool calls, with per-step duration bars.</Tip>
            <CTA onClick={() => nav('/projects/ai-testing?view=agent-testing')} label="Open Agent Testing" />
          </Section>

          <Section id="agent-configs" title="Agent Configs — reusable definitions" icon={Bot}>
            <p>
              Save an agent's <code>provider / model / system-prompt / max-iters /
              MCP linkage</code> as a named config and bind it to suites of type
              <code> agent</code> or <code>tool_calling</code>.
            </p>
            <Code>{`Name:           HR Support Agent
Type:           single
Protocol:       mcp
Provider/Model: openai / gpt-4o-mini
System prompt:  You answer HR questions using the linked MCP server.
MCP server:     DeepWiki                  (from MCP Studio)`}</Code>
            <CTA onClick={() => nav('/projects/ai-testing?view=agents')} label="Open Agent Configs" />
          </Section>

          <Section id="marketplace" title="Agent Marketplace" icon={Store}>
            <p>
              A curated catalog of agents (built-in + 3rd-party). Click "Try in
              Playground" on any card → the Agent Testing form auto-fills with
              that agent's provider, model, system prompt, or base URL.
            </p>
            <CTA onClick={() => nav('/projects/ai-testing?view=marketplace')} label="Browse Marketplace" />
          </Section>

          <Section id="mcp" title="MCP servers (read-only mirror)" icon={Server}>
            <p>
              AI Testing does NOT maintain its own MCP server registry. It
              mirrors the registry from <strong>MCP Studio</strong> so agents
              in this workspace can bind to one. Add new servers in MCP Studio
              and they show up here automatically.
            </p>
            <CTA onClick={() => nav('/projects/mcp')} label="Open MCP Studio" />
          </Section>

          {/* <Section id="webhooks" title="Webhooks — CI/CD callbacks" icon={Webhook}>
            <p>
              Subscribe a URL to run-lifecycle events and you'll get a POST
              with the run payload (HMAC-SHA256 signed if you set a secret).
              Auto-disables after 5 consecutive 4xx/5xx failures.
            </p>
            <Code>{`POST   https://hooks.example.com/forgefuzz
Events run.completed, run.failed, run.baselined

Headers:
  Content-Type:        application/json
  X-ForgeQ-Event:      run.completed
  X-ForgeQ-Signature:  sha256=<HMAC over body>`}</Code>
            <CTA onClick={() => nav('/projects/ai-testing?view=webhooks')} label="Open Webhooks" />
          </Section> */}

          <Section id="analytics" title="Analytics & Token usage" icon={BarChart3}>
            <p>
              The Analytics tab shows model comparison (pass-rate, cost, avg
              latency), top failing assertions, latency p50/p95/p99, cost
              over time, tokens per day (in vs out), spend share by model.
            </p>
            <p>
              Hover the <strong>token budget badge</strong> in the sidebar to
              see a live tooltip with per-key spend &amp; top models by cost.
              All numbers come from real run aggregations — never fake.
            </p>
            <CTA onClick={() => nav('/projects/ai-testing?view=analytics')} label="Open Analytics" />
          </Section>
        </main>

        <div className="fixed bottom-4 right-4 hidden text-xs text-text-muted lg:block">
          Press <kbd className="rounded border border-border bg-elevated px-1.5 py-0.5 font-mono text-xs">/</kbd> to navigate
        </div>
      </div>
    </DocsContext.Provider>
  );
}