/**
 * EnvironmentsPage — Postman-parity environment manager.
 *
 * Layout (mirrors Postman 11.x environments view):
 *
 *   ┌── Sidebar (left) ──────────────┐  ┌── Detail (right) ───────────────────────────────┐
 *   │ Globals  (always at top)       │  │  ▣ Color  Name           [scope] [Active] [⋮]  │
 *   │ ───────────────────────────────│  │   Reveal | Activate | Duplicate | Export | Del │
 *   │ ▤ Search...                    │  │ ─────────────────────────────────────────────── │
 *   │ ▾ Environments (workspace)     │  │ Variables   |   Snapshots                       │
 *   │   • Production    (4 vars)     │  │ ┌─────────────────────────────────────────────┐ │
 *   │   • Staging       (2 vars)     │  │ │ ☑ KEY  TYPE  INITIAL VALUE  CURRENT VALUE  │ │
 *   │ + New / + Import (menu)        │  │ │ ...                                         │ │
 *   │                                │  │ │ + Add variable                              │ │
 *   │ Trash (drawer)                 │  │ └─────────────────────────────────────────────┘ │
 *   └────────────────────────────────┘  │  Persist current → initial    [Save]            │
 *                                       └─────────────────────────────────────────────────┘
 *
 * Java endpoints used (all `/api/v1/environments`):
 *   GET / · GET /trash · GET /{id} · POST / · PUT /{id}?snapshot= · DELETE /{id} · POST /{id}/restore
 *   PATCH /{id}/variables/{key} · DELETE /{id}/variables/{key}
 *   POST /{id}/snapshots · GET /{id}/snapshots · GET /{id}/snapshots/{sid} · POST /{id}/snapshots/{sid}/restore
 *   POST /import (multipart) · POST /globals/import (multipart) · GET /{id}/export · GET /globals/export
 *   POST /{id}/activate · POST /{id}/deactivate (BFF-only convenience)
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Trash2, Eye, EyeOff, Lock, Loader2, Check, Search, Globe,
  MoreHorizontal, Copy, Download, Upload, History, RotateCcw, Zap, ZapOff,
  X, ChevronDown, FileJson, FileUp, Edit3, Pencil, AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { usePrompt } from '@/components/ui/PromptDialog';
import { cn } from '@/utils/cn';
import {
  listEnvironments, getEnvironment, createEnvironment, updateEnvironment, deleteEnvironment,
  patchVariable, deleteVariable,
  activateEnvironment, deactivateEnvironment,
  listSnapshots, createSnapshot, restoreSnapshot,
  importPostmanEnvironment, importPostmanGlobals,
  exportPostmanEnvironment, exportPostmanGlobals,
  listEnvironmentTrash, restoreEnvironment,
  type Environment, type EnvVariable, type VariableType, type EnvScope,
  type EnvSnapshot,
} from '@/services/environment.service';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { useSettings } from '@/stores/settings.store';

type Tab = 'variables' | 'snapshots';

export const EnvironmentsPage = () => {
  const ws = useWorkspaceStore((s) => s.current);
  const qc = useQueryClient();
  const confirm = useConfirm();
  const prompt = usePrompt();
  const [reveal, setReveal] = useState(false);
  const [search, setSearch] = useState('');
  const [scopeFilter, setScopeFilter] = useState<'ALL' | EnvScope>('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showTrash, setShowTrash] = useState(false);
  const [tab, setTab] = useState<Tab>('variables');

  const { data: envs = [], isLoading } = useQuery({
    queryKey: ['environments', ws?.id, reveal],
    queryFn: () => listEnvironments(ws?.id, reveal),
    enabled: !!ws?.id,
  });

  const filtered = useMemo(() => {
    return envs.filter((e) => {
      if (scopeFilter !== 'ALL' && e.scope !== scopeFilter) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return e.name.toLowerCase().includes(q) || (e.description || '').toLowerCase().includes(q);
    });
  }, [envs, search, scopeFilter]);

  const globals = filtered.find((e) => e.scope === 'GLOBAL');
  const others = filtered.filter((e) => e.scope !== 'GLOBAL');

  const selected = useMemo(
    () => filtered.find((e) => e.id === selectedId) ?? globals ?? others[0] ?? null,
    [filtered, selectedId, globals, others],
  );
  useEffect(() => {
    if (selected && selected.id !== selectedId) setSelectedId(selected.id);
  }, [selected?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!ws) return <Empty msg="Select a project first to manage its environments." />;

  return (
    <div data-testid="environments-page" className="flex h-full min-h-0 bg-probestack-bg">
      <Sidebar
        loading={isLoading}
        globals={globals}
        envs={others}
        selectedId={selected?.id ?? null}
        onSelect={(id) => { setSelectedId(id); setTab('variables'); }}
        search={search} onSearch={setSearch}
        scope={scopeFilter} onScope={setScopeFilter}
        onCreate={async () => {
          const name = await prompt({
            title: 'Create environment',
            label: 'Environment name',
            placeholder: 'e.g. Staging, Production',
            confirmText: 'Create',
            testId: 'env-create-prompt',
          });
          if (!name) return;
          const e = await createEnvironment(ws.id, { name, scope: 'ENVIRONMENT', variables: [] });
          setSelectedId(e.id);
          await qc.invalidateQueries({ queryKey: ['environments'] });
          toast.success('Environment created');
        }}
        onImportEnv={async (file) => {
          try {
            const e = await importPostmanEnvironment(ws.id, file);
            setSelectedId(e.id);
            await qc.invalidateQueries({ queryKey: ['environments'] });
            toast.success('Environment imported');
          } catch (err: any) {
            toast.error(err?.message ?? 'Import failed');
          }
        }}
        onImportGlobals={async (file) => {
          try {
            const e = await importPostmanGlobals(file);
            setSelectedId(e.id);
            await qc.invalidateQueries({ queryKey: ['environments'] });
            toast.success('Globals imported');
          } catch (err: any) {
            toast.error(err?.message ?? 'Import failed');
          }
        }}
        onOpenTrash={() => setShowTrash(true)}
      />
      <div className="min-w-0 flex-1 overflow-hidden">
        {selected ? (
          <Detail
            key={selected.id}
            env={selected}
            tab={tab}
            onTab={setTab}
            reveal={reveal}
            onToggleReveal={() => setReveal((r) => !r)}
            onSelect={setSelectedId}
            onDelete={async () => {
              const ok = await confirm({
                title: `Delete environment "${selected.name}"?`,
                description: 'It will move to trash for 30 days, then be permanently removed.',
                confirmText: 'Move to trash',
                tone: 'danger',
              });
              if (!ok) return;
              await deleteEnvironment(selected.id);
              setSelectedId(null);
              await qc.invalidateQueries({ queryKey: ['environments'] });
              toast.success('Environment moved to trash');
            }}
            onDuplicate={async () => {
              const e = await createEnvironment(selected.workspaceId ?? ws.id, {
                name: `${selected.name} Copy`,
                description: selected.description,
                color: selected.color,
                scope: selected.scope,
                variables: (selected.variables ?? []).map((v) => ({
                  key: v.key, value: v.value, type: v.type, enabled: v.enabled, description: v.description,
                })),
              });
              setSelectedId(e.id);
              await qc.invalidateQueries({ queryKey: ['environments'] });
              toast.success('Duplicated');
            }}
            onExport={async () => {
              const r = selected.scope === 'GLOBAL'
                ? await exportPostmanGlobals(ws.id, reveal)
                : await exportPostmanEnvironment(selected.id, reveal);
              const url = URL.createObjectURL(r.blob);
              const a = document.createElement('a');
              a.href = url;
              const m = (r.contentDisposition || '').match(/filename="([^"]+)"/);
              a.download = m?.[1] || `${selected.name}.postman_environment.json`;
              document.body.appendChild(a); a.click(); a.remove();
              URL.revokeObjectURL(url);
              toast.success('Exported');
            }}
          />
        ) : (
          <Empty msg="No environment selected." />
        )}
      </div>
      {showTrash && ws && <TrashDrawer workspaceId={ws.id} onClose={() => setShowTrash(false)} />}
    </div>
  );
};

/* ─── Sidebar ─────────────────────────────────────────────────────────── */
const Sidebar = ({
  loading, globals, envs, selectedId, onSelect, search, onSearch,
  scope, onScope, onCreate, onImportEnv, onImportGlobals, onOpenTrash,
}: {
  loading: boolean;
  globals?: Environment;
  envs: Environment[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  search: string;
  onSearch: (s: string) => void;
  scope: 'ALL' | EnvScope;
  onScope: (s: 'ALL' | EnvScope) => void;
  onCreate: () => void;
  onImportEnv: (f: File) => void;
  onImportGlobals: (f: File) => void;
  onOpenTrash: () => void;
}) => {
  const [menu, setMenu] = useState(false);
  const fileEnvRef = useRef<HTMLInputElement>(null);
  const fileGlobalsRef = useRef<HTMLInputElement>(null);
  return (
    <aside className="flex w-72 shrink-0 flex-col border-r border-border bg-surface" data-testid="env-sidebar">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Environments</span>
        <div className="relative flex items-center gap-1">
          <button
            onClick={onOpenTrash}
            data-testid="env-trash-btn"
            title="Trash"
            className="flex h-6 w-6 items-center justify-center rounded text-text-muted hover:bg-hover hover:text-text-primary"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <button
            data-testid="env-add-menu"
            onClick={() => setMenu((m) => !m)}
            className="flex h-6 items-center gap-1 rounded-md bg-primary px-2 text-[11px] font-medium text-white hover:bg-primary-hover"
          >
            <Plus className="h-3 w-3" /> New <ChevronDown className="h-3 w-3" />
          </button>
          {menu && (
            <div
              className="absolute right-0 top-7 z-20 w-56 rounded-md border border-border bg-surface p-1 text-xs shadow-lg"
              onMouseLeave={() => setMenu(false)}
            >
              <MenuItem icon={Plus} testId="env-menu-new" onClick={() => { setMenu(false); onCreate(); }}>
                Create empty environment
              </MenuItem>
              <MenuItem icon={FileUp} testId="env-menu-import" onClick={() => { setMenu(false); fileEnvRef.current?.click(); }}>
                Import Postman environment.json
              </MenuItem>
              <MenuItem icon={FileJson} testId="env-menu-import-globals" onClick={() => { setMenu(false); fileGlobalsRef.current?.click(); }}>
                Import Postman globals.json
              </MenuItem>
            </div>
          )}
          <input
            ref={fileEnvRef} type="file" accept=".json,application/json"
            data-testid="env-import-file" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onImportEnv(f); e.currentTarget.value = ''; }}
          />
          <input
            ref={fileGlobalsRef} type="file" accept=".json,application/json"
            data-testid="env-import-globals-file" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onImportGlobals(f); e.currentTarget.value = ''; }}
          />
        </div>
      </div>

      <div className="flex items-center gap-1 border-b border-border px-2 py-1.5">
        <div className="flex flex-1 items-center gap-1.5 rounded-md border border-border bg-probestack-bg px-2">
          <Search className="h-3 w-3 text-text-muted" />
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search environments…"
            data-testid="env-search"
            className="h-7 flex-1 bg-transparent text-xs outline-none placeholder:text-text-muted"
          />
        </div>
      </div>

      <div className="flex items-center gap-1 border-b border-border px-2 py-1">
        {(['ALL', 'ENVIRONMENT', 'WORKSPACE', 'GLOBAL'] as const).map((s) => (
          <button
            key={s}
            data-testid={`env-scope-${s.toLowerCase()}`}
            onClick={() => onScope(s)}
            className={cn(
              'rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide',
              scope === s ? 'bg-primary-muted text-primary' : 'text-text-muted hover:bg-hover',
            )}
          >
            {s === 'ALL' ? 'All' : s === 'ENVIRONMENT' ? 'Env' : s === 'WORKSPACE' ? 'Wsp' : 'Global'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto p-1">
        {loading && (
          <div className="space-y-1.5 p-2" data-testid="env-sidebar-skeleton">
            {[0,1,2,3,4].map((i) => (
              <div key={i} className="flex items-center gap-2 px-1 py-1.5">
                <Skeleton className="h-2 w-2 rounded-full" />
                <Skeleton className="h-3 flex-1" />
              </div>
            ))}
          </div>
        )}
        {!loading && globals && (
          <SidebarRow env={globals} selected={selectedId === globals.id} onSelect={onSelect} pinned />
        )}
        {!loading && envs.length === 0 && !globals && (
          <div className="p-3 text-xs text-text-muted">No environments. Click "+ New" to create one.</div>
        )}
        {envs.map((e) => (
          <SidebarRow key={e.id} env={e} selected={selectedId === e.id} onSelect={onSelect} />
        ))}
      </div>
    </aside>
  );
};

const SidebarRow = ({
  env, selected, onSelect, pinned,
}: { env: Environment; selected: boolean; onSelect: (id: string) => void; pinned?: boolean }) => {
  const settings = useSettings();
  const isActive = settings.activeEnvId === env.id;
  return (
    <button
      data-testid={`env-${env.id}`}
      onClick={() => onSelect(env.id)}
      className={cn(
        'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors',
        selected ? 'bg-primary-muted text-primary' : 'hover:bg-hover',
        pinned && 'border-b border-border/50 mb-1',
      )}
    >
      {env.scope === 'GLOBAL' ? (
        <Globe className="h-3.5 w-3.5 shrink-0 text-amber-500" />
      ) : (
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: env.color || '#64748b' }} />
      )}
      <span className="min-w-0 flex-1 truncate font-medium">{env.name}</span>
      <span className="text-[10px] text-text-muted">{env.variableCount ?? env.variables?.length ?? 0}</span>
      {isActive && <Zap className="h-3 w-3 text-yellow-500" />}
    </button>
  );
};

const MenuItem = ({
  icon: Icon, onClick, children, testId,
}: { icon: any; onClick: () => void; children: React.ReactNode; testId?: string }) => (
  <button
    onClick={onClick}
    data-testid={testId}
    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-hover"
  >
    <Icon className="h-3.5 w-3.5 text-text-muted" />
    {children}
  </button>
);

/* ─── Detail (header + tabs + variables/snapshots) ───────────────────── */
const Detail = ({
  env, tab, onTab, reveal, onToggleReveal, onSelect,
  onDelete, onDuplicate, onExport,
}: {
  env: Environment;
  tab: Tab;
  onTab: (t: Tab) => void;
  reveal: boolean;
  onToggleReveal: () => void;
  onSelect: (id: string | null) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onExport: () => void;
}) => {
  const settings = useSettings();
  const isActive = settings.activeEnvId === env.id;
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <section className="flex h-full min-h-0 flex-col" data-testid="env-detail">
      <Header
        env={env}
        isActive={isActive}
        reveal={reveal}
        onToggleReveal={onToggleReveal}
        onActivateToggle={async () => {
          if (isActive) {
            await deactivateEnvironment(env.id);
            settings.setActiveEnvId(null);
          } else {
            await activateEnvironment(env.id);
            settings.setActiveEnvId(env.id);
          }
        }}
        onMenuToggle={() => setMenuOpen((m) => !m)}
        menuOpen={menuOpen}
        onCloseMenu={() => setMenuOpen(false)}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onExport={onExport}
      />

      <nav className="flex items-center gap-1 border-b border-border bg-surface px-4">
        <TabBtn active={tab === 'variables'} onClick={() => onTab('variables')} testId="env-tab-variables">
          Variables
        </TabBtn>
        <TabBtn active={tab === 'snapshots'} onClick={() => onTab('snapshots')} testId="env-tab-snapshots">
          Snapshots
        </TabBtn>
      </nav>

      <div className="min-h-0 flex-1 overflow-auto">
        {tab === 'variables' ? (
          <VariablesEditor env={env} reveal={reveal} />
        ) : (
          <SnapshotsPanel env={env} />
        )}
      </div>
    </section>
  );
};

const TabBtn = ({
  active, onClick, children, testId,
}: { active: boolean; onClick: () => void; children: React.ReactNode; testId?: string }) => (
  <button
    onClick={onClick}
    data-testid={testId}
    className={cn(
      '-mb-px border-b-2 px-3 py-2 text-xs font-medium transition-colors',
      active
        ? 'border-primary text-primary'
        : 'border-transparent text-text-secondary hover:text-text-primary',
    )}
  >
    {children}
  </button>
);

const Header = ({
  env, isActive, reveal, onToggleReveal, onActivateToggle,
  onMenuToggle, menuOpen, onCloseMenu, onDelete, onDuplicate, onExport,
}: {
  env: Environment;
  isActive: boolean;
  reveal: boolean;
  onToggleReveal: () => void;
  onActivateToggle: () => void;
  onMenuToggle: () => void;
  menuOpen: boolean;
  onCloseMenu: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onExport: () => void;
}) => {
  const qc = useQueryClient();
  const [name, setName] = useState(env.name);
  const [color, setColor] = useState(env.color ?? '#3b82f6');
  const [editing, setEditing] = useState(false);
  useEffect(() => { setName(env.name); setColor(env.color ?? '#3b82f6'); setEditing(false); }, [env.id, env.name, env.color]);

  const save = useMutation({
    mutationFn: () => updateEnvironment(env.id, { name, color }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['environments'] });
      setEditing(false);
      toast.success('Saved');
    },
  });

  return (
    <header className="flex items-center justify-between gap-3 border-b border-border bg-surface px-4 py-2.5">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <input
          type="color"
          value={color}
          onChange={(e) => { setColor(e.target.value); setEditing(true); }}
          className="h-8 w-8 cursor-pointer rounded border border-border bg-transparent"
          data-testid="env-color"
          title="Pick a color"
        />
        {editing ? (
          <input
            value={name}
            autoFocus
            onChange={(e) => setName(e.target.value)}
            onBlur={() => save.mutate()}
            onKeyDown={(e) => { if (e.key === 'Enter') save.mutate(); if (e.key === 'Escape') { setName(env.name); setEditing(false); } }}
            data-testid="env-name"
            className="h-8 w-72 rounded-md border border-border bg-probestack-bg px-3 text-sm font-semibold outline-none focus:border-primary"
          />
        ) : (
          <button
            onClick={() => setEditing(true)}
            data-testid="env-name-display"
            className="flex items-center gap-2 rounded-md px-2 py-1 text-sm font-semibold hover:bg-hover"
          >
            {env.name}
            <Pencil className="h-3 w-3 text-text-muted" />
          </button>
        )}
        <ScopeBadge scope={env.scope} />
        {isActive && (
          <span className="flex items-center gap-1 rounded bg-yellow-500/10 px-2 py-0.5 text-[10px] font-semibold text-yellow-500">
            <Zap className="h-3 w-3" /> ACTIVE
          </span>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button variant="outline" data-testid="env-reveal" onClick={onToggleReveal}>
          {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {reveal ? 'Hide' : 'Reveal'}
        </Button>
        <Button variant="outline" data-testid="env-activate" onClick={onActivateToggle}>
          {isActive ? <ZapOff className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
          {isActive ? 'Deactivate' : 'Activate'}
        </Button>
        <div className="relative">
          <button
            data-testid="env-menu-btn"
            onClick={onMenuToggle}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-text-muted hover:bg-hover hover:text-text-primary"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {menuOpen && (
            <div
              className="absolute right-0 top-9 z-20 w-48 rounded-md border border-border bg-surface p-1 text-xs shadow-lg"
              onMouseLeave={onCloseMenu}
            >
              <MenuItem icon={Copy} testId="env-menu-duplicate" onClick={() => { onCloseMenu(); onDuplicate(); }}>Duplicate</MenuItem>
              <MenuItem icon={Download} testId="env-menu-export" onClick={() => { onCloseMenu(); onExport(); }}>Export Postman JSON</MenuItem>
              <div className="my-1 border-t border-border" />
              <MenuItem icon={Trash2} testId="env-menu-delete" onClick={() => { onCloseMenu(); onDelete(); }}>
                <span className="text-red-500">Delete</span>
              </MenuItem>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

const ScopeBadge = ({ scope }: { scope: EnvScope }) => {
  const map: Record<EnvScope, { label: string; cls: string }> = {
    GLOBAL: { label: 'GLOBAL', cls: 'bg-amber-500/10 text-amber-500' },
    WORKSPACE: { label: 'WORKSPACE', cls: 'bg-blue-500/10 text-blue-500' },
    ENVIRONMENT: { label: 'ENV', cls: 'bg-emerald-500/10 text-emerald-500' },
    COLLECTION: { label: 'COLLECTION', cls: 'bg-purple-500/10 text-purple-500' },
  };
  const m = map[scope];
  return <span className={cn('rounded px-2 py-0.5 text-[10px] font-semibold', m.cls)}>{m.label}</span>;
};

/* ─── Variables editor (Postman-parity 5-column table + bulk edit) ───── */
type Row = EnvVariable & { initialValue: string };

const VariablesEditor = ({ env: envSummary, reveal }: { env: Environment; reveal: boolean }) => {
  const qc = useQueryClient();
  
  // The list endpoint returns env *summaries* (no `variables` array).
  // Fetch the authoritative detail for this id.
  const { data: env = envSummary } = useQuery({
    queryKey: ['environment-detail', envSummary.id, reveal],
    queryFn: () => getEnvironment(envSummary.id, reveal),
    enabled: !!envSummary.id,
    staleTime: 10_000,
    initialData: envSummary.variables?.length ? envSummary : undefined,
  });
  
  const [rows, setRows] = useState<Row[]>(() =>
    (env.variables ?? []).map((v) => ({ ...v, initialValue: v.value })),
  );
  const [bulk, setBulk] = useState(false);
  const [bulkText, setBulkText] = useState('');

  useEffect(() => {
    setRows((env.variables ?? []).map((v) => ({ ...v, initialValue: v.value })));
  }, [env.id, env.variables, env.updatedAt]);

  const save = useMutation({
    mutationFn: () => updateEnvironment(env.id, {
      variables: rows.map(({ initialValue: _i, ...rest }) => rest as EnvVariable),
    }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['environments'] });
      toast.success('Variables saved');
    },
  });

  const persistAll = () => {
    setRows((s) => s.map((r) => ({ ...r, initialValue: r.value })));
    save.mutate();
  };
  const resetCurrentToInitial = () => {
    setRows((s) => s.map((r) => ({ ...r, value: r.initialValue })));
    toast.success('Current values reset to initial');
  };

  const enterBulk = () => {
    setBulkText(rows.filter((r) => r.key).map((r) => `${r.key}=${r.value}${r.type === 'SECRET' ? '  [secret]' : ''}`).join('\n'));
    setBulk(true);
  };
  const exitBulk = (apply: boolean) => {
    if (apply) {
      const next: Row[] = bulkText.split('\n').map((line) => {
        const t = line.trim();
        if (!t || t.startsWith('#') || t.startsWith('//')) return null;
        const eq = t.indexOf('=');
        if (eq <= 0) return null;
        const key = t.slice(0, eq).trim();
        let value = t.slice(eq + 1);
        const isSecret = /\[secret\]\s*$/i.test(value);
        if (isSecret) value = value.replace(/\[secret\]\s*$/i, '').trimEnd();
        return {
          key,
          value: value.replace(/^\s+/, ''),
          type: isSecret ? 'SECRET' as VariableType : 'DEFAULT' as VariableType,
          enabled: true,
          description: '',
          initialValue: value.replace(/^\s+/, ''),
        };
      }).filter(Boolean) as Row[];
      setRows(next);
      toast.success(`Parsed ${next.length} variables`);
    }
    setBulk(false);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-6" data-testid="env-variables-editor">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-text-secondary">
          Variables follow Postman precedence: <strong>Local &gt; Environment &gt; Workspace &gt; Global</strong>.
          Use <code className="rounded bg-elevated px-1 font-mono">{'{{key}}'}</code> in requests.
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" data-testid="env-bulk-toggle" onClick={() => (bulk ? exitBulk(false) : enterBulk())}>
            <Edit3 className="h-3.5 w-3.5" /> {bulk ? 'Cancel bulk' : 'Bulk edit'}
          </Button>
          <Button variant="outline" data-testid="env-reset-current" onClick={resetCurrentToInitial}>
            <RotateCcw className="h-3.5 w-3.5" /> Reset current
          </Button>
          <Button variant="primary" data-testid="env-persist-all" disabled={save.isPending} onClick={persistAll}>
            {save.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            Persist & save
          </Button>
        </div>
      </div>

      {bulk ? (
        <div className="rounded-md border border-border">
          <div className="border-b border-border bg-surface px-3 py-2 text-[11px] text-text-muted">
            One per line — <code className="font-mono">KEY=value</code>. Append <code className="font-mono">[secret]</code> to mark as secret.
          </div>
          <textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            data-testid="env-bulk-text"
            className="h-72 w-full resize-y bg-probestack-bg p-3 font-mono text-xs outline-none"
            spellCheck={false}
          />
          <div className="flex justify-end gap-2 border-t border-border p-2">
            <Button variant="outline" data-testid="env-bulk-cancel" onClick={() => exitBulk(false)}>Cancel</Button>
            <Button variant="primary" data-testid="env-bulk-apply" onClick={() => exitBulk(true)}>Apply</Button>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-md border border-border">
          <div className="grid grid-cols-[28px_1fr_120px_1fr_1fr_36px] items-center gap-2 border-b border-border bg-surface px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
            <span></span>
            <span>Variable</span>
            <span>Type</span>
            <span>Initial value</span>
            <span>Current value</span>
            <span></span>
          </div>
          {rows.map((v, i) => (
            <VariableRow
              key={`${env.id}:${i}`}
              row={v}
              reveal={reveal}
              testIdx={i}
              onChange={(patch) => setRows((s) => s.map((x, j) => (j === i ? { ...x, ...patch } : x)))}
              onPersistRow={async () => {
                if (!v.key) return;
                await patchVariable(env.id, v.key, {
                  value: v.value, type: v.type, enabled: v.enabled, description: v.description,
                });
                setRows((s) => s.map((x, j) => (j === i ? { ...x, initialValue: v.value } : x)));
                await qc.invalidateQueries({ queryKey: ['environments'] });
              }}
              onDelete={async () => {
                if (v.key) {
                  await deleteVariable(env.id, v.key);
                  await qc.invalidateQueries({ queryKey: ['environments'] });
                }
                setRows((s) => s.filter((_, j) => j !== i));
              }}
            />
          ))}
          <button
            onClick={() => setRows((s) => [...s, { key: '', value: '', initialValue: '', type: 'DEFAULT', enabled: true }])}
            data-testid="env-var-add"
            className="flex w-full items-center gap-2 border-t border-border bg-hover/30 px-3 py-2 text-xs text-text-secondary hover:bg-hover hover:text-primary"
          >
            <Plus className="h-3.5 w-3.5" /> Add variable
          </button>
        </div>
      )}
    </div>
  );
};

const VariableRow = ({
  row, reveal, testIdx, onChange, onPersistRow, onDelete,
}: {
  row: Row;
  reveal: boolean;
  testIdx: number;
  onChange: (p: Partial<Row>) => void;
  onPersistRow: () => Promise<void> | void;
  onDelete: () => void;
}) => {
  const dirty = row.value !== row.initialValue;
  return (
    <div className="grid grid-cols-[28px_1fr_120px_1fr_1fr_36px] items-center gap-2 border-b border-border/60 px-3 py-1.5 last:border-b-0 hover:bg-hover/30">
      <input
        type="checkbox"
        checked={row.enabled}
        onChange={(e) => onChange({ enabled: e.target.checked })}
        data-testid={`env-var-enabled-${testIdx}`}
      />
      <input
        value={row.key}
        onChange={(e) => onChange({ key: e.target.value })}
        placeholder="VARIABLE_NAME"
        data-testid={`env-var-key-${testIdx}`}
        className="h-7 rounded border border-border bg-probestack-bg px-2 font-mono text-xs outline-none hover:border-primary/40 focus:border-primary"
      />
      <select
        value={row.type}
        onChange={(e) => onChange({ type: e.target.value as VariableType })}
        data-testid={`env-var-type-${testIdx}`}
        className="h-7 rounded border border-border bg-probestack-bg px-1 text-xs"
      >
        <option value="DEFAULT">Default</option>
        <option value="SECRET">Secret</option>
      </select>
      <input
        value={row.initialValue}
        onChange={(e) => onChange({ initialValue: e.target.value })}
        placeholder="initial"
        data-testid={`env-var-initial-${testIdx}`}
        className="h-7 rounded border border-border bg-probestack-bg px-2 font-mono text-xs outline-none hover:border-primary/40 focus:border-primary"
      />
      <div className="relative">
        <input
          type={row.type === 'SECRET' && !reveal ? 'password' : 'text'}
          value={row.value}
          onChange={(e) => onChange({ value: e.target.value })}
          onBlur={() => { if (dirty) onPersistRow(); }}
          placeholder="current"
          data-testid={`env-var-value-${testIdx}`}
          className={cn(
            'h-7 w-full rounded border bg-probestack-bg px-2 pr-6 font-mono text-xs outline-none focus:border-primary',
            dirty ? 'border-yellow-500/60' : 'border-border hover:border-primary/40',
          )}
        />
        {row.type === 'SECRET' && (
          <Lock className="pointer-events-none absolute right-1.5 top-1.5 h-3 w-3 text-yellow-500" />
        )}
        {dirty && (
          <span
            className="pointer-events-none absolute -right-2 -top-1 h-2 w-2 rounded-full bg-yellow-500"
            title="Unpersisted change"
          />
        )}
      </div>
      <button
        onClick={onDelete}
        data-testid={`env-var-del-${testIdx}`}
        className="flex h-7 w-7 items-center justify-center rounded text-text-muted hover:bg-hover hover:text-red-500"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

/* ─── Snapshots panel ──────────────────────────────────────────────── */
const SnapshotsPanel = ({ env }: { env: Environment }) => {
  const qc = useQueryClient();
  const prompt = usePrompt();
  const { data = [], isLoading, refetch } = useQuery({
    queryKey: ['env-snapshots', env.id],
    queryFn: () => listSnapshots(env.id),
  });
  const [busy, setBusy] = useState<string | null>(null);

  const onCreate = async () => {
    const label = await prompt({
      title: 'Create snapshot',
      label: 'Snapshot label (optional)',
      placeholder: `Snapshot ${new Date().toLocaleString()}`,
      initialValue: `Snapshot ${new Date().toLocaleString()}`,
      confirmText: 'Create snapshot',
      requireValue: false,
      testId: 'env-snapshot-prompt',
    });
    if (label === null) return;
    await createSnapshot(env.id, label || undefined);
    await refetch();
    toast.success('Snapshot created');
  };
  const onRestore = async (s: EnvSnapshot) => {
    setBusy(s.id);
    try {
      await restoreSnapshot(env.id, s.id);
      await qc.invalidateQueries({ queryKey: ['environments'] });
      await refetch();
      toast.success(`Restored "${s.label}". Pre-restore state was auto-snapshotted.`);
    } catch (e: any) {
      toast.error(e?.message ?? 'Restore failed');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6" data-testid="env-snapshots-panel">
      <div className="flex items-center justify-between">
        <p className="text-xs text-text-secondary">
          Snapshots freeze the variable state. Restoring auto-snapshots the current state first, so you can undo the restore.
        </p>
        <Button variant="primary" data-testid="env-snapshot-create" onClick={onCreate}>
          <History className="h-3.5 w-3.5" /> Take snapshot
        </Button>
      </div>
      {isLoading && (
        <div className="space-y-2 p-2" data-testid="env-snapshots-skeleton">
          {[0,1,2].map((i) => (
            <div key={i} className="flex items-center gap-3 rounded-md border border-border bg-surface px-3 py-2.5">
              <Skeleton className="h-4 w-4 shrink-0" />
              <div className="min-w-0 flex-1 space-y-1">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-2.5 w-48" />
              </div>
              <Skeleton className="h-6 w-16" />
            </div>
          ))}
        </div>
      )}
      {!isLoading && data.length === 0 && (
        <div className="rounded-md border border-border bg-surface p-6 text-center text-xs text-text-secondary" data-testid="env-snapshots-empty">
          No snapshots yet. Take one to capture the current variable state.
        </div>
      )}
      <ul className="space-y-2">
        {data.map((s) => (
          <li
            key={s.id}
            data-testid={`env-snapshot-${s.id}`}
            className="flex items-center gap-3 rounded-md border border-border bg-surface px-3 py-2.5"
          >
            <History className="h-4 w-4 text-text-muted" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-medium">{s.label}</div>
              <div className="truncate text-[10px] text-text-muted">
                {s.createdAt} · {s.variableCount} vars · {s.secretCount} secrets {s.auto && '· auto'}
              </div>
            </div>
            <Button
              variant="outline"
              data-testid={`env-snapshot-restore-${s.id}`}
              disabled={busy !== null}
              onClick={() => onRestore(s)}
            >
              {busy === s.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
              Restore
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
};

/* ─── Trash drawer ─────────────────────────────────────────────────── */
const TrashDrawer = ({ workspaceId, onClose }: { workspaceId: string; onClose: () => void }) => {
  const qc = useQueryClient();
  const { data = [], isLoading, refetch } = useQuery({
    queryKey: ['env-trash', workspaceId],
    queryFn: () => listEnvironmentTrash(workspaceId),
  });
  const [busy, setBusy] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose} data-testid="env-trash-drawer">
      <div className="w-full max-w-lg rounded-xl border border-border bg-surface p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/10 text-red-500">
            <Trash2 className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold">Environment trash</h3>
            <p className="text-[11px] text-text-secondary">Restorable for 30 days.</p>
          </div>
          <button onClick={onClose} data-testid="env-trash-close" className="flex h-7 w-7 items-center justify-center rounded text-text-muted hover:bg-hover hover:text-text-primary">
            <X className="h-4 w-4" />
          </button>
        </div>
        {isLoading && (
          <div className="space-y-2 py-2" data-testid="env-trash-skeleton">
            {[0,1].map((i) => (
              <div key={i} className="flex items-center gap-3 rounded-md border border-border bg-probestack-bg px-3 py-2">
                <Skeleton className="h-4 w-4 shrink-0" />
                <div className="min-w-0 flex-1 space-y-1">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-2.5 w-40" />
                </div>
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>
        )}
        {!isLoading && data.length === 0 && (
          <div className="rounded-md border border-border bg-elevated p-6 text-center text-xs text-text-secondary" data-testid="env-trash-empty">
            Trash is empty.
          </div>
        )}
        {!isLoading && data.length > 0 && (
          <ul className="max-h-[60vh] space-y-1 overflow-auto">
            {data.map((e) => (
              <li
                key={e.id}
                data-testid={`env-trash-row-${e.id}`}
                className="flex items-center gap-3 rounded-md border border-border bg-probestack-bg px-3 py-2"
              >
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: e.color || '#64748b' }} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-medium">{e.name}</div>
                  <div className="truncate text-[10px] text-text-secondary">{e.scope}</div>
                </div>
                <Button
                  variant="outline"
                  data-testid={`env-trash-restore-${e.id}`}
                  disabled={busy !== null}
                  onClick={async () => {
                    setBusy(e.id);
                    try {
                      await restoreEnvironment(e.id);
                      toast.success(`"${e.name}" restored`);
                      await refetch();
                      await qc.invalidateQueries({ queryKey: ['environments'] });
                    } catch (err: any) {
                      toast.error(err?.message ?? 'Restore failed');
                    } finally {
                      setBusy(null);
                    }
                  }}
                >
                  {busy === e.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                  Restore
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

const Empty = ({ msg }: { msg: string }) => (
  <div className="flex h-full flex-col items-center justify-center gap-2 text-center" data-testid="env-empty">
    <Globe className="h-8 w-8 text-primary" />
    <div className="text-sm font-semibold">{msg}</div>
  </div>
);
