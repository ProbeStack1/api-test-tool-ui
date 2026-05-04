/**
 * VariablesPanel — left workspace sidebar shown when the "Variables" rail is
 * active. Lists the variable scopes in precedence order (top → bottom).
 *
 * Precedence (highest to lowest, exactly Postman's resolution order):
 *
 *   1. Local        (runtime — set by scripts; never persisted)
 *   2. Data         (CSV/JSON injected by the runner — TODO)
 *   3. Environment  (the active env — user picks via right-rail switcher)
 *   4. Collection   (per-collection variables)
 *   5. Workspace    (project-scoped envs — apply to every collection)
 *   6. Global       (org-wide; lowest precedence)
 *
 * The user explicitly asked for the list to read TOP → BOTTOM as
 * "Global → Workspace → Collection → Local". We surface BOTH framings:
 * the visual order is the user's, but the help text explains the actual
 * resolution order so it's never ambiguous.
 */
import { Globe2, Briefcase, Package, FolderOpen, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useVariablesUi, type VarScope } from '@/stores/variables-ui.store';

interface ScopeItem {
  scope: VarScope;
  label: string;
  icon: LucideIcon;
  hint: string;
  /** display priority — only used to colour the dot, NOT the visual order. */
  priorityRank: number;
}

const SCOPES: ScopeItem[] = [
  { scope: 'GLOBAL',      label: 'Globals',      icon: Globe2,    hint: 'Org-wide · lowest priority', priorityRank: 6 },
  { scope: 'WORKSPACE',   label: 'Project',      icon: Briefcase, hint: 'Apply to every collection in this project', priorityRank: 5 },
  { scope: 'COLLECTION',  label: 'Collection',   icon: Package,   hint: 'Variables scoped to one collection', priorityRank: 4 },
  { scope: 'ENVIRONMENT', label: 'Environments', icon: FolderOpen, hint: 'Switchable per request — beats Project + Global', priorityRank: 3 },
  { scope: 'LOCAL',       label: 'Local',        icon: Sparkles,  hint: 'Runtime-only · highest priority', priorityRank: 1 },
];

const DOT_COLOR: Record<number, string> = {
  1: 'bg-rose-400',     // Local — top precedence
  3: 'bg-emerald-400',  // Environment
  4: 'bg-sky-400',      // Collection
  5: 'bg-blue-400',     // Workspace
  6: 'bg-amber-400',    // Global
};

export const VariablesPanel = () => {
  const nav = useNavigate();
  const scope = useVariablesUi((s) => s.scope);
  const setScope = useVariablesUi((s) => s.setScope);

  const onClick = (s: VarScope) => {
    setScope(s);
    // Always navigate to the variables workspace page so the main area
    // swaps to the table view.
    nav('/projects/variables');
  };

  return (
    <div className="flex h-full flex-col" data-testid="variables-panel">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
          Variables
        </span>
      </div>

      <ul className="flex-1 space-y-0.5 overflow-auto p-2">
        {SCOPES.map((s) => {
          const Icon = s.icon;
          const active = scope === s.scope;
          return (
            <li key={s.scope}>
              <button
                data-testid={`var-scope-${s.scope.toLowerCase()}`}
                onClick={() => onClick(s.scope)}
                className={cn(
                  'group relative flex w-full items-center gap-2 rounded-md px-2 py-2 text-left transition-colors',
                  active
                    ? 'bg-primary-muted text-primary'
                    : 'hover:bg-hover text-text-secondary hover:text-text-primary',
                )}
              >
                <span className={cn('h-2 w-2 shrink-0 rounded-full', DOT_COLOR[s.priorityRank])} aria-hidden />
                <Icon className="h-4 w-4 shrink-0" />
                <span className="min-w-0 flex-1">
                  <div className="truncate text-xs font-medium">{s.label}</div>
                  <div className="truncate text-[10px] text-text-muted">{s.hint}</div>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="border-t border-border bg-surface/40 p-3" data-testid="variables-panel-help">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-text-secondary">
          Resolution order
        </div>
        <ol className="mt-1 list-decimal pl-4 text-[10px] leading-snug text-text-muted">
          <li>Local <em className="text-text-secondary">(highest)</em></li>
          <li>Environment</li>
          <li>Collection</li>
          <li>Project</li>
          <li>Global <em className="text-text-secondary">(lowest)</em></li>
        </ol>
        <div className="mt-1.5 text-[10px] leading-snug text-text-muted">
          Reference any variable in a request as <code className="rounded bg-elevated px-1 font-mono">{'{{KEY}}'}</code>.
        </div>
      </div>
    </div>
  );
};
