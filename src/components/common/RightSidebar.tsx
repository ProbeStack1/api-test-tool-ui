/**
 * Right rail + expandable panel — Project / Variables / cURL / AI.
 *
 * Project  : list of user's projects (backend term: workspace); select a project
 *            to see its details in-panel.
 * Variables: Postman-style environment + globals editor.
 * cURL     : auto-generated cURL for the active request.
 * AI       : request-aware chat (knows selected request details, auto-triggers on error).
 */
import { useEffect, useState } from 'react';
import {
  Globe, Lock, Building2, ChevronDown, ChevronRight,EyeOff,Eye,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useLayout, type RightPanelTab } from '@/stores/layout.store';
import { Tooltip } from '@/components/ui/Tooltip';
import { ResizeHandle } from '@/components/ui/ResizeHandle';
import { cn } from '@/utils/cn';
import { useNavigate } from 'react-router-dom';
import { listWorkspaces, type Visibility } from '@/services/workspace.service';
import { listEnvironments, getEnvironment, type Environment } from '@/services/environment.service';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { useSettings } from '@/stores/settings.store';
import { Skeleton } from '@/components/ui/Skeleton';
import { CodeSnippetPanel } from '@/components/code-snippet/CodeSnippetPanel';
import { RequestAwareAiTab } from '@/components/ai/RequestAwareAiTab';
import { AppIcon, type IconName } from '@/components/icons/AppIcons';

const VisIcon = ({ v }: { v: Visibility }) => {
  const Ico = v === 'PUBLIC' ? Globe : v === 'TEAM' ? Building2 : Lock;
  return <Ico className="h-3 w-3 shrink-0 text-text-muted" />;
};

const RAIL: { key: RightPanelTab; icon: IconName; label: string }[] = [
  { key: 'project', icon: 'project', label: 'Project' },
  { key: 'variables', icon: 'variables', label: 'Variables' },
  { key: 'curl', icon: 'code', label: 'Snippet' },
  { key: 'ai', icon: 'zap', label: 'AI' },
];

export const RightRail = () => {
  const activeTab = useLayout((s) => s.rightPanelTab);
  const setTab = useLayout((s) => s.setRightTab);
  const expanded = useLayout((s) => s.showRightSidebar);
  const toggle = useLayout((s) => s.toggleRight);

  const onClick = (key: RightPanelTab) => {
    if (expanded && activeTab === key) toggle();
    else {
      if (!expanded) toggle();
      setTab(key);
    }
  };

  return (
    <aside
      data-testid="right-rail"
      className="flex w-14 shrink-0 flex-col items-stretch gap-1 border-l border-border bg-surface py-2"
    >
      {RAIL.map(({ key, icon, label }) => {
        const active = expanded && activeTab === key;
        return (
          <Tooltip key={key} content={label} side="left">
            <button
              data-testid={`right-rail-${key}`}
              onClick={() => onClick(key)}
              className={cn(
                'group mx-1 flex flex-col items-center gap-0.5 rounded-md px-1 py-1.5 text-[9px] font-medium uppercase tracking-wide transition-all duration-150',
                'text-text-secondary hover:bg-hover hover:text-text-primary',
                active && 'bg-primary-muted text-primary',
              )}
            >
              <AppIcon name={icon} animated active={active} className="h-[17px] w-[17px]" />
              <span className="leading-tight">{label}</span>
            </button>
          </Tooltip>
        );
      })}
    </aside>
  );
};

export const RightPanel = () => {
  const tab = useLayout((s) => s.rightPanelTab);
  const width = useLayout((s) => s.rightPanelWidth);
  const nudge = useLayout((s) => s.nudgeRightPanel);
  const isResizing = useLayout((s) => s.isResizing);

  return (
    <>
      <ResizeHandle
        direction="horizontal"
        onResize={nudge}
        invert
        testId="right-panel-resize"
      />
      <aside
        data-testid="right-panel"
        style={{ width }}
        className={cn(
          'flex shrink-0 flex-col overflow-hidden border-l border-border bg-surface',
          !isResizing && 'transition-[width] duration-200 ease-out',
        )}
      >
        <header className="flex h-10 items-center border-b border-border px-3">
          <span
            data-testid="right-panel-title"
            className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary"
          >
            {tab === 'project' && 'Projects'}
            {tab === 'variables' && 'Variables'}
            {tab === 'curl' && 'Snippet'}
            {tab === 'ai' && 'Request-aware AI'}
          </span>
        </header>
        <div className="min-h-0 flex-1 overflow-auto text-xs">
          {tab === 'project' && <ProjectTab />}
          {tab === 'variables' && <VariablesTab />}
          {tab === 'curl' && <CodeSnippetPanel />}
          {tab === 'ai' && <RequestAwareAiTab />}
        </div>
      </aside>
    </>
  );
};

/* ================== Tab bodies ================== */

const ProjectTab = () => {
  const navigate = useNavigate();
  const current = useWorkspaceStore((s) => s.current);
  const setCurrent = useWorkspaceStore((s) => s.setCurrent);
  const [search, setSearch] = useState('');
  const { data: workspaces = [], isLoading } = useQuery({
    queryKey: ['workspaces'],
    queryFn: listWorkspaces,
  });
  // auto-select first if nothing selected — must happen in an effect to
  // avoid the "Cannot update a component while rendering a different
  // component" warning React fires when we call setCurrent during render.
  useEffect(() => {
    if (!current && workspaces.length > 0) setCurrent(workspaces[0]);
  }, [current, workspaces, setCurrent]);
  const filtered = workspaces.filter((w) =>
    !search || w.name.toLowerCase().includes(search.toLowerCase()) || w.slug.includes(search.toLowerCase()),
  );
  const selected = workspaces.find((w) => w.id === current?.id) ?? null;

  return (
    <div className="flex h-full flex-col" data-testid="project-tab">
      {/* Top row: [search 70%] [+ 30%] */}
      <div className="flex items-center gap-2 border-b border-border p-2">
        <div className="relative flex-1">
          <AppIcon name="search" className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
          <input
            data-testid="project-search"
            placeholder="Search projects…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 w-full rounded-md border border-border bg-probestack-bg pl-7 pr-2 text-xs outline-none hover:border-primary/40 focus:border-primary"
          />
        </div>
        <button
          data-testid="project-new-btn"
          onClick={() => navigate('/project')}
          title="Create new project"
          className="flex h-8 shrink-0 items-center gap-1 rounded-md border border-primary/60 bg-transparent px-2.5 text-[11px] font-medium text-primary transition-colors hover:bg-primary-muted"
        >
          <AppIcon name="create" animated className="h-3.5 w-3.5" /> Create
        </button>
      </div>

      {/* List — expands to fill available space */}
      <div className="flex-1 overflow-auto">
        {isLoading && (
          <div className="space-y-2 p-3" data-testid="project-tab-skeleton">
            {[0,1,2,3].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 shrink-0" />
                <Skeleton className="h-3 flex-1" />
              </div>
            ))}
          </div>
        )}
        {!isLoading && filtered.length === 0 && (
          <div className="p-3 text-xs text-text-muted">
            {search ? 'No projects match.' : 'No projects yet — create one to get started.'}
          </div>
        )}
        {filtered.map((p) => (
          <button
            key={p.id}
            data-testid={`project-item-${p.id}`}
            onClick={() => setCurrent(p)}
            className={cn(
              'flex w-full items-center gap-2 border-l-2 px-3 py-2 text-left transition-colors',
              selected?.id === p.id
                ? 'border-primary bg-primary-muted/40 text-text-primary'
                : 'border-transparent text-text-secondary hover:bg-hover hover:text-text-primary',
            )}
          >
            {selected?.id === p.id
              ? <AppIcon name="check" className="h-3.5 w-3.5 shrink-0 text-primary" />
              : <VisIcon v={p.visibility} />}
            <span className="min-w-0 flex-1 truncate text-xs">{p.name}</span>
          </button>
        ))}
      </div>

      {/* Details — pinned to the BOTTOM of the panel */}
      {selected ? (
        <div
          className="border-t border-border bg-surface/40 p-3"
          data-testid="project-tab-details"
        >
          <div className="mb-2.5 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary-muted text-primary">
              <AppIcon name="project" animated className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-semibold text-text-primary">{selected.name}</div>
              <div className="truncate text-[10px] text-text-muted">{selected.slug}</div>
            </div>
            <button
              data-testid="project-open-details"
              onClick={() => navigate(`/project/${selected.id}`)}
              className="rounded-md border border-border px-2 py-0.5 text-[10px] text-text-secondary transition-colors hover:border-primary/40 hover:text-primary"
            >
              Open
            </button>
          </div>
          <div className="space-y-1.5">
            <Meta k="Visibility" v={<span className="inline-flex items-center gap-1 capitalize"><VisIcon v={selected.visibility} />{selected.visibility.toLowerCase()}</span>} />
            <Meta k="Members" v={String(selected.memberCount)} />
            <Meta k="My role" v={selected.myRole ?? '—'} />
            <Meta k="Lead" v={selected.projectLead || '—'} />
            <Meta k="Email" v={selected.workspaceEmail || '—'} />
            <Meta k="Created" v={new Date(selected.createdAt).toLocaleDateString()} />
          </div>
        </div>
      ) : null}
    </div>
  );
};

const Meta = ({ k, v }: { k: string; v: React.ReactNode }) => (
  <div className="flex items-start justify-between gap-3 text-xs">
    <span className="text-text-muted">{k}</span>
    <span className="text-text-primary">{v}</span>
  </div>
);

const VariablesTab = () => {
  const navigate = useNavigate();
  const ws = useWorkspaceStore((s) => s.current);
  const settings = useSettings();
  const activeId = settings.activeEnvId;
  const setActive = settings.setActiveEnvId;

  const { data: envs = [], isLoading } = useQuery({
    queryKey: ['environments', ws?.id, true],
    queryFn: () => listEnvironments(ws?.id, true),
    enabled: !!ws?.id,
  });

  // Dropdown ke liye sirf ENVIRONMENT-scoped envs (project/global singletons
  // are shown in their own collapsible sections below).
  const envOptions = envs.filter((e) => e.scope === 'ENVIRONMENT');
  const active = envOptions.find((e) => e.id === activeId) ?? null;
  const project = envs.find((e) => e.scope === 'WORKSPACE' && e.workspaceId === ws?.id) ?? null;
  const globals = envs.find((e) => e.scope === 'GLOBAL') ?? null;

  return (
    <div className="flex h-full flex-col" data-testid="variables-tab">
      {/* Env switcher + single Manage variables button */}
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <select
          data-testid="rv-env-switcher"
          value={activeId ?? ''}
          onChange={(e) => setActive(e.target.value || null)}
          className="h-7 flex-1 rounded-md border border-border bg-probestack-bg px-2 text-[11px] outline-none hover:border-primary/40 focus:border-primary"
        >
          <option value="">No environment</option>
          {envOptions.map((e) => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
        </select>
        <button
          data-testid="rv-manage"
          onClick={() => navigate('/projects/variables')}
          className="flex h-7 items-center gap-1.5 rounded border border-primary/60 px-2.5 text-[11px] font-medium text-primary hover:bg-primary-muted"
        >
          <AppIcon name="create" animated className="h-3 w-3" /> Manage 
        </button>
      </div>

      {/* Body: scrollable */}
      <div className="flex-1 overflow-auto">
        {isLoading && (
          <div className="space-y-3 p-3" data-testid="rv-skeleton">
            {[0, 1, 2].map((s) => (
              <div key={s} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-5/6" />
              </div>
            ))}
          </div>
        )}

        {!isLoading && (
          <>
            <RvCollapsibleSection
              title="Active environment"
              subtitle={active ? active.name : 'None — pick one above'}
              testId="rv-section-active"
              env={active}
              defaultOpen
            />
            <RvCollapsibleSection
              title="Project variables"
              subtitle={project ? project.name : 'No project variables yet'}
              testId="rv-section-project"
              env={project}
              defaultOpen
            />
            <RvCollapsibleSection
              title="Globals"
              subtitle={globals ? globals.name : 'No globals yet'}
              testId="rv-section-globals"
              env={globals}
              defaultOpen
            />
          </>
        )}
      </div>

      {/* Footer: precedence reminder */}
      <div className="border-t border-border bg-surface/40 px-3 py-2 text-[10px] leading-snug text-text-muted">
        <strong className="text-text-secondary">Precedence:</strong> Local &gt; Environment &gt; Collection &gt; Project &gt; Global. Use <code className="rounded bg-elevated px-1 font-mono">{'{{KEY}}'}</code>.
      </div>
    </div>
  );
};

const RvCollapsibleSection = ({
  title, subtitle, testId, env, defaultOpen,
}: {
  title: string;
  subtitle: string;
  testId: string;
  env: Environment | null;
  defaultOpen?: boolean;
}) => {
  const [open, setOpen] = useState(!!defaultOpen);
  const Chev = open ? ChevronDown : ChevronRight;
  return (
    <section data-testid={testId} className="border-b border-border last:border-b-0">
      <button
        type="button"
        data-testid={`${testId}-toggle`}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-3 py-1.5 text-left transition-colors hover:bg-hover/40"
      >
        <span className="flex min-w-0 items-center gap-1.5">
          <Chev className="h-3 w-3 shrink-0 text-text-muted" />
          <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">{title}</span>
        </span>
        <span className="ml-2 truncate text-[10px] text-text-secondary" title={subtitle}>{subtitle}</span>
      </button>
      {open && (
        env ? <RvVarTable envId={env.id} groupHeader={undefined} /> : <div className="px-3 pb-2 text-[11px] text-text-muted">—</div>
      )}
    </section>
  );
};

const RvVarTable = ({ envId, groupHeader }: { envId: string; groupHeader?: string }) => {
  const { data: env, isLoading } = useQuery({
    queryKey: ['environment-detail', envId, true],
    queryFn: () => getEnvironment(envId, true),
    staleTime: 30_000,
  });
  const enabled = (env?.variables ?? []).filter((v) => v.enabled);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  // Track which secret is being held (temporary reveal)
  const [revealingKey, setRevealingKey] = useState<string | null>(null);

  const handleRevealStart = (key: string, e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    setRevealingKey(key);
  };

  const handleRevealEnd = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    setRevealingKey(null);
  };

  if (isLoading) {
    return <div className="px-3 pb-2 text-[11px] text-text-muted">Loading…</div>;
  }
  if (enabled.length === 0) return <div className="px-3 pb-3 text-[11px] text-text-muted">{groupHeader ? `${groupHeader} — no variables.` : 'No variables.'}</div>;
  
  return (
    <div className="pb-1.5" data-testid={`rv-vars-${envId}`}>
      {groupHeader && (
        <div className="px-3 pb-1 text-[10px] text-text-muted">{groupHeader}</div>
      )}
      <table className="w-full table-fixed font-mono text-[11px]">
        <thead className="text-[10px] uppercase text-text-muted">
          <tr>
            <th className="w-2/5 px-3 py-1 text-left font-medium">Key</th>
            <th className="px-2 py-1 text-left font-medium">Current</th>
          </tr>
        </thead>
        <tbody>
          {enabled.map((v) => {
            const expanded = expandedKey === v.key;
            const isSecret = v.type === 'SECRET';
            // Show raw value if either secret is being held OR not secret
            const showRaw = !isSecret || revealingKey === v.key;
            const displayValue = showRaw ? (v.value || '—') : '••••••';
            
            return (
              <tr
                key={v.key}
                data-testid={`rv-var-${envId}-${v.key}`}
                onClick={() => setExpandedKey(expanded ? null : v.key)}
                className="cursor-pointer border-t border-border/40 hover:bg-hover"
              >
                <td className="px-3 py-1 align-top">
                  <span className={cn('inline-flex items-center gap-1', !expanded && 'block max-w-full truncate')} title={v.key}>
                    {v.key}
                    {isSecret && <Lock className="inline-block h-2.5 w-2.5 shrink-0 text-yellow-500" />}
                  </span>
                </td>
                <td className="px-2 py-1 align-top text-text-primary">
                  {expanded ? (
                    <div className="flex items-center gap-2">
                      <span className="block whitespace-pre-wrap break-all flex-1">
                        {displayValue}
                      </span>
                      {isSecret && (
                        <button
                          onMouseDown={(e) => handleRevealStart(v.key, e)}
                          onMouseUp={handleRevealEnd}
                          onMouseLeave={handleRevealEnd}
                          onTouchStart={(e) => handleRevealStart(v.key, e)}
                          onTouchEnd={handleRevealEnd}
                          onTouchCancel={handleRevealEnd}
                          className="shrink-0 text-text-muted hover:text-primary transition-colors"
                          title="Press and hold to reveal secret"
                        >
                          {revealingKey === v.key ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="block truncate flex-1" title={isSecret ? (showRaw ? v.value : 'Hold eye to reveal') : v.value}>
                        {displayValue}
                      </span>
                      {isSecret && (
                        <button
                          onMouseDown={(e) => handleRevealStart(v.key, e)}
                          onMouseUp={handleRevealEnd}
                          onMouseLeave={handleRevealEnd}
                          onTouchStart={(e) => handleRevealStart(v.key, e)}
                          onTouchEnd={handleRevealEnd}
                          onTouchCancel={handleRevealEnd}
                          className="shrink-0 text-text-muted hover:text-primary transition-colors"
                          title="Press and hold to reveal secret"
                        >
                          {revealingKey === v.key ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};